import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Available actions that AI can return
const AVAILABLE_ACTIONS = [
  "view_next_appointment",
  "reschedule_appointment",
  "book_appointment",
  "view_upcoming_appointments",
  "view_remaining_procedures",
  "view_treatment_progress",
  "send_message_to_doctor",
  "send_message_to_front_desk",
  "view_unpaid_invoices",
  "view_past_invoices",
  "view_all_invoices",
  "view_procedure_price",
  "view_price_list",
  "view_treatment_plan_details",
  "view_next_procedure",
  "view_completed_treatments",
  "remind_appointment",
  "cancel_appointment",
  "view_promotions",
  "view_available_slots",
  "add_to_calendar",
  "view_messages",
  "update_contact_info",
  "view_procedure_details",
  "download_invoice",
  "view_dental_history",
  "view_next_treatment_step",
  "view_assigned_doctor",
  "check_appointment_procedures",
  "view_weekend_slots",
  "general_response",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, message, conversationHistory = [] } = body;

    if (!patientId || !message) {
      return NextResponse.json(
        { error: "patientId and message are required" },
        { status: 400 }
      );
    }

    // Get patient context
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        appointments: {
          where: {
            datetime: { gte: new Date() },
          },
          orderBy: { datetime: "asc" },
          take: 10,
        },
        treatmentPlans: {
          include: {
            procedures: {
              take: 10,
            },
          },
          take: 5,
        },
      },
    });

    // Get AI settings (prompt)
    const aiSettings = await prisma.aISettings.findFirst();
    const systemPrompt = aiSettings?.prompt || "";

    // Pull last assistant action/data from history
    let lastAssistantAction: string | null = null;
    let lastAssistantData: any = null;
    let lastAssistantResponse: string | null = null;
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const entry = conversationHistory[i];
      const role = entry.role || (entry.sender === "patient" ? "user" : "assistant");
      if (role !== "assistant") continue;
      const content = entry.content || entry.message;
      if (!content || typeof content !== "string") continue;
      try {
        const parsed = JSON.parse(content);
        if (parsed?.action) {
          lastAssistantAction = parsed.action;
          lastAssistantData = parsed.data ?? null;
          lastAssistantResponse = parsed.title || parsed.response || null;
          break;
        }
      } catch {
        // Not a structured response, continue searching
        continue;
      }
    }

    const normalizedMessage = typeof message === "string" ? message.trim().toLowerCase() : "";
    const schedulePhrases = [
      "давай",
      "давай сделаем",
      "го",
      "го сделаем",
      "погнали",
      "let's do it",
      "let's schedule",
      "go ahead",
      "schedule it",
      "book it",
      "make it",
      "сделаем",
      "запиши меня",
    ];
    const wantsToSchedule =
      lastAssistantAction &&
      ["view_next_appointment", "view_upcoming_appointments"].includes(
        lastAssistantAction
      ) &&
      schedulePhrases.some((phrase) => normalizedMessage.includes(phrase));

    if (wantsToSchedule) {
      return NextResponse.json({
        action: "book_appointment",
        data: {},
        response: "Sure, let me help you schedule an appointment.",
        rawResponse: JSON.stringify({ forced: true, reason: "follow_up_booking" }),
      });
    }

    // Build context for AI
    const patientContext = patient
      ? `
PATIENT CONTEXT:
- Name: ${patient.name}
- Email: ${patient.email}
- Phone: ${patient.phone || "N/A"}

Upcoming Appointments:
${
  patient.appointments
    .map(
      (apt) => `- ${apt.title} on ${new Date(apt.datetime).toLocaleString()}`
    )
    .join("\n") || "No upcoming appointments"
}

Treatment Plans:
${
  patient.treatmentPlans
    .map((plan) => `- ${plan.title}: ${plan.status}`)
    .join("\n") || "No treatment plans"
}
`
      : "";

    const conversationContext = lastAssistantAction
      ? `
LAST ASSISTANT ACTION: ${lastAssistantAction}
${lastAssistantResponse ? `Assistant said: "${lastAssistantResponse}"` : ""}
This action returned ${Array.isArray(lastAssistantData) ? `${lastAssistantData.length} item(s)` : lastAssistantData ? "data" : "no data"}.
Use this context to interpret short follow-up replies (e.g., "go", "давай") as requests to continue the previous topic instead of starting over.
`
      : "";

    // Create enhanced system prompt with action requirement
    const enhancedPrompt = `${systemPrompt}

CRITICAL: You MUST respond with ONLY a valid JSON object. The JSON must have this exact structure:
{
  "action": "one_of_the_available_actions",
  "data": {},
  "response": "A natural, conversational response to the user's message"
}

${conversationContext}

CRITICAL ACTION MAPPING RULES:
1. Analyze the user's question carefully and match it to the MOST SPECIFIC action from the list above
2. Questions about treatments/treatment plans → use "view_treatment_plan_details"
3. Questions about invoices/bills:
   - If user asks specifically about "unpaid", "outstanding", "what I owe" → use "view_unpaid_invoices"
   - If user asks specifically about "past", "paid", "history" → use "view_past_invoices"
   - If user asks generally "do I have invoices?", "show me invoices", "my invoices" → use "view_all_invoices"
4. Questions about appointments → use "view_next_appointment", "view_upcoming_appointments", etc.
5. Questions about procedures → use "view_remaining_procedures", "view_next_procedure", etc.
6. ONLY use "general_response" if the question truly doesn't match any specific action
7. The "action" field is what the frontend will use to display the correct UI - choose it carefully!
8. Pay attention to short follow-up replies like "давай", "го", "let's do it", "ok", "go ahead". They usually mean the user wants to proceed with the previous action (e.g., after showing appointments, such replies should trigger "book_appointment" if there were none).
9. Requests to cancel, reschedule, book, or view available time slots MUST map to the corresponding appointment action even if the patient does not specify a date.

MANDATORY DATA REQUIREMENTS:
- When you select "view_procedure_price", set the data object to include at least {"procedureName": "<exact procedure name mentioned by the user>"}.
- When you select "view_available_slots", include any user constraints such as {"preferredDate": "YYYY-MM-DD"} if they mention a specific date or timeframe. If none are mentioned, you may leave the data object empty.
- When you select "cancel_appointment", include the appointment reference if the patient specifies it (e.g., {"appointmentId": "..."}). If they do not provide one, leave the data empty so the system can pick the soonest upcoming appointment to cancel.
- When you select "update_contact_info", include any new contact fields the patient mentioned (e.g., {"phone": "...", "email": "..."}). If they did not provide new information, return an empty object.

IMPORTANT: The "response" field is REQUIRED but will NOT be used - the frontend only uses the "action" field. You can put any text here, but focus on getting the "action" field correct.

Available actions with examples:
- view_next_appointment: "when is my next appointment?", "what's my next visit?", "next appointment"
- reschedule_appointment: "reschedule my appointment", "change appointment date", "move my appointment"
- book_appointment: "book an appointment", "schedule a visit", "make an appointment"
- view_upcoming_appointments: "show my appointments", "all my appointments", "upcoming visits"
- view_remaining_procedures: "what procedures are left?", "remaining procedures", "what's left to do"
- view_treatment_progress: "how is my treatment going?", "treatment progress", "how far along am I"
- send_message_to_doctor: "message my dentist", "contact my doctor", "send message to doctor"
- send_message_to_front_desk: "message front desk", "contact reception", "send message to front desk", "connect me to the clinic", "talk to the clinic team", "соедини меня с клиникой"
- view_unpaid_invoices: "unpaid invoices", "what do I owe", "outstanding balance", "unpaid bills", "bills I need to pay"
- view_past_invoices: "past invoices", "invoice history", "previous invoices", "paid invoices"
- view_all_invoices: "do I have invoices?", "show me my invoices", "all my invoices", "invoices", "my invoices", "what invoices do I have"
- view_procedure_price: "how much does [procedure] cost", "price of [procedure]", "cost of [procedure]"
- view_price_list: "price list", "pricelist", "show me prices", "what procedures do you offer"
- view_treatment_plan_details: "what are my treatments?", "my treatment plans", "what treatments do I have", "show my treatments", "do I have treatments", "treatment plan details"
- view_next_procedure: "what's my next procedure", "next procedure", "what procedure is next"
- view_completed_treatments: "completed treatments", "what have I finished", "done procedures"
- remind_appointment: "remind me about appointment", "appointment reminder", "send me a reminder"
- cancel_appointment: "cancel my appointment", "cancel appointment", "I want to cancel", "call off my visit"
- view_promotions: "promotions", "discounts", "special offers", "any promotions"
- view_available_slots: "available times", "when can I book", "free slots", "available appointments", "show available time slots"
- add_to_calendar: "add to calendar", "save to calendar", "calendar"
- view_messages: "show messages", "my messages", "messages from doctor"
- update_contact_info: "update my phone", "change email", "update contact", "I want to update my contact information"
- view_procedure_details: "details about [procedure]", "what is [procedure]", "tell me about [procedure]", "show details of my procedure"
- download_invoice: "download invoice", "get invoice pdf", "invoice download"
- view_dental_history: "dental history", "my history", "past treatments", "show my dental history"
- view_next_treatment_step: "next step in treatment", "what's next in my plan"
- view_assigned_doctor: "who is my dentist", "my doctor", "assigned doctor"
- check_appointment_procedures: "what procedures in my appointment", "appointment includes"
- view_weekend_slots: "weekend availability", "weekend appointments", "saturday sunday"
- general_response: ONLY use this if the question doesn't match ANY of the above actions. Try to map to a specific action first!

STRICTLY return ONLY valid JSON, no other text before or after.`;

    // Prepare conversation history
    const messages: any[] = [
      {
        role: "system",
        content: enhancedPrompt + patientContext,
      },
    ];

    // Add conversation history
    conversationHistory.forEach((msg: any) => {
      messages.push({
        role: msg.role || (msg.sender === "patient" ? "user" : "assistant"),
        content: msg.content || msg.message,
      });
    });

    // Add current message
    messages.push({
      role: "user",
      content: message,
    });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const aiResponse = completion.choices[0]?.message?.content || "";

    // Parse JSON response
    let actionData;
    try {
      actionData = JSON.parse(aiResponse);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", aiResponse);
      // Fallback to general_response if parsing fails
      actionData = {
        action: "general_response",
        data: { message: aiResponse },
      };
    }

    // Validate action
    if (!AVAILABLE_ACTIONS.includes(actionData.action)) {
      actionData.action = "general_response";
    }

    // Ensure response field exists - if AI didn't provide it, generate a default based on action
    let responseText = actionData.response;
    if (!responseText || responseText.trim() === "") {
      // Generate a default response based on the action
      const actionResponses: Record<string, string> = {
        view_next_appointment: "Let me check your next appointment for you.",
        reschedule_appointment: "I'll help you reschedule your appointment.",
        book_appointment: "I'll help you book a new appointment.",
        view_upcoming_appointments:
          "Let me show you your upcoming appointments.",
        view_remaining_procedures:
          "Let me check what procedures are remaining in your treatment plan.",
        view_treatment_progress: "Let me show you your treatment progress.",
        send_message_to_doctor: "I'll send a message to your dentist.",
        send_message_to_front_desk: "I'll send a message to the front desk.",
        view_unpaid_invoices: "Let me check your unpaid invoices.",
        view_past_invoices: "Let me show you your past invoices.",
        view_procedure_price: "Let me check the price for that procedure.",
        view_price_list: "Let me show you our price list.",
        view_treatment_plan_details:
          "Let me show you the details of your treatment plan.",
        view_next_procedure: "Let me check what your next procedure is.",
        view_completed_treatments: "Let me show you your completed treatments.",
        remind_appointment: "I'll send you a reminder about your appointment.",
        cancel_appointment: "I'll help you cancel your appointment.",
        view_promotions: "Let me check for available promotions.",
        view_available_slots: "Let me check available time slots for you.",
        add_to_calendar: "I'll add that appointment to your calendar.",
        view_messages: "Let me show you your messages.",
        update_contact_info: "I'll help you update your contact information.",
        view_procedure_details:
          "Let me show you the details of that procedure.",
        download_invoice: "I'll help you download that invoice.",
        view_dental_history: "Let me show you your dental history.",
        view_next_treatment_step:
          "Let me check what your next treatment step is.",
        view_assigned_doctor: "Let me check who your assigned dentist is.",
        check_appointment_procedures:
          "Let me check what procedures are included in that appointment.",
        view_weekend_slots: "Let me check for weekend availability.",
      general_response:
        "I’m ready to help! Let me know what you’d like to do.\n\nExamples:\n• “Provide me the invoices list”\n• “Show my upcoming appointments”",
      };
      responseText =
        actionResponses[actionData.action] ||
        `Processing your request: ${actionData.action}`;
    }

    console.log("[AI] Returning response:", {
      action: actionData.action,
      response: responseText,
      hasResponseField: !!actionData.response,
    });

    return NextResponse.json({
      action: actionData.action,
      data: actionData.data || {},
      response: responseText,
      rawResponse: aiResponse,
    });
  } catch (error: any) {
    console.error("AI chat action error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to process AI request",
        action: "general_response",
        data: { error: "AI service unavailable" },
      },
      { status: 500 }
    );
  }
}
