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

    // Build context for AI
    const patientContext = patient
      ? `
PATIENT CONTEXT:
- Name: ${patient.name}
- Email: ${patient.email}
- Phone: ${patient.phone || "N/A"}

Upcoming Appointments:
${patient.appointments.map((apt) => `- ${apt.title} on ${new Date(apt.datetime).toLocaleString()}`).join("\n") || "No upcoming appointments"}

Treatment Plans:
${patient.treatmentPlans.map((plan) => `- ${plan.title}: ${plan.status}`).join("\n") || "No treatment plans"}
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

IMPORTANT: The "response" field is REQUIRED and must contain a friendly, conversational message that directly answers the user's question or acknowledges their request. This message will be displayed to the user in the chat. Do NOT just repeat the action name - provide a natural, helpful response as if you are a dental assistant talking to the patient.

The "action" field indicates what action should be taken based on the user's request, but the "response" field is what the user will see in the chat.

Available actions:
- view_next_appointment: When user asks about their next appointment
- reschedule_appointment: When user wants to reschedule an appointment
- book_appointment: When user wants to book a new appointment
- view_upcoming_appointments: When user asks to see all upcoming appointments
- view_remaining_procedures: When user asks what procedures are left in treatment plan
- view_treatment_progress: When user asks about treatment progress
- send_message_to_doctor: When user wants to message their dentist
- send_message_to_front_desk: When user wants to message front desk
- view_unpaid_invoices: When user asks about balance or unpaid invoices
- view_past_invoices: When user asks to see past invoices
- view_procedure_price: When user asks about cost of a specific procedure
- view_price_list: When user asks to see clinic pricelist
- view_treatment_plan_details: When user asks what's included in treatment plan
- view_next_procedure: When user asks what procedure is next
- view_completed_treatments: When user asks to see completed treatments
- remind_appointment: When user asks for appointment reminder
- cancel_appointment: When user wants to cancel an appointment
- view_promotions: When user asks about promotions or special offers
- view_available_slots: When user asks for available time slots
- add_to_calendar: When user wants to add appointment to calendar
- view_messages: When user asks to see messages from dentist
- update_contact_info: When user wants to update contact information
- view_procedure_details: When user asks for details about a specific procedure
- download_invoice: When user wants to download an invoice
- view_dental_history: When user asks about dental history
- view_next_treatment_step: When user asks about next step in treatment plan
- view_assigned_doctor: When user asks who their dentist is
- check_appointment_procedures: When user asks if appointment includes specific procedure
- view_weekend_slots: When user asks for weekend availability
- general_response: For general questions that don't match any specific action

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
        view_upcoming_appointments: "Let me show you your upcoming appointments.",
        view_remaining_procedures: "Let me check what procedures are remaining in your treatment plan.",
        view_treatment_progress: "Let me show you your treatment progress.",
        send_message_to_doctor: "I'll send a message to your dentist.",
        send_message_to_front_desk: "I'll send a message to the front desk.",
        view_unpaid_invoices: "Let me check your unpaid invoices.",
        view_past_invoices: "Let me show you your past invoices.",
        view_procedure_price: "Let me check the price for that procedure.",
        view_price_list: "Let me show you our price list.",
        view_treatment_plan_details: "Let me show you the details of your treatment plan.",
        view_next_procedure: "Let me check what your next procedure is.",
        view_completed_treatments: "Let me show you your completed treatments.",
        remind_appointment: "I'll send you a reminder about your appointment.",
        cancel_appointment: "I'll help you cancel your appointment.",
        view_promotions: "Let me check for available promotions.",
        view_available_slots: "Let me check available time slots for you.",
        add_to_calendar: "I'll add that appointment to your calendar.",
        view_messages: "Let me show you your messages.",
        update_contact_info: "I'll help you update your contact information.",
        view_procedure_details: "Let me show you the details of that procedure.",
        download_invoice: "I'll help you download that invoice.",
        view_dental_history: "Let me show you your dental history.",
        view_next_treatment_step: "Let me check what your next treatment step is.",
        view_assigned_doctor: "Let me check who your assigned dentist is.",
        check_appointment_procedures: "Let me check what procedures are included in that appointment.",
        view_weekend_slots: "Let me check for weekend availability.",
        general_response: "I understand. How can I help you further?",
      };
      responseText = actionResponses[actionData.action] || `Processing your request: ${actionData.action}`;
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

