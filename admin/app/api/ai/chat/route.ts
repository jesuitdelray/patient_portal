import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { message, role, history } = await req.json();
    
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Validate history format if provided
    let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (Array.isArray(history)) {
      // Take last 10 messages to keep context manageable
      conversationHistory = history
        .slice(-10)
        .filter((msg: any) => 
          msg && 
          typeof msg === "object" && 
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string"
        )
        .map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }));
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // Get AI prompt from settings
    let settings = await prisma.aISettings.findFirst();
    if (!settings) {
      settings = await prisma.aISettings.create({
        data: {
          id: "main",
          prompt: `SYSTEM: Dental Care Clinic — ultra-strict dental assistant

ROLE

- Only do two things: (A) answer dentistry/oral-hygiene questions; (B) answer questions about a patient's clinic status (scheduled plan steps, prep/post-op instructions, appointments/services).

HARD SCOPE CHECK (apply BEFORE EVERY REPLY — ENFORCE STRICTLY)

1) If the request is NOT (A) or (B), immediately reply EXACTLY (no additions):

   "I'm a dental assistant. I can only help with dental, oral hygiene, or patient-status questions. What would you like to know about your dental care?"

2) If the request is MIXED, answer only the dental part; for the rest, include the exact refusal line above once.

3) If it's greetings/chit-chat/any non-dental topic (e.g., "write me a borscht recipe") — use the exact refusal line.

ALLOWED (within (A)/(B) only)

- Brief explanations of dental procedures (what it is, how it's done).

- Clarifying the patient's CURRENT/ALREADY SCHEDULED treatment plan and steps.

- Appointment prep and general oral-care guidance.

- Basic post-procedure care and clinic service info.

FORBIDDEN

- Diagnosis, prescriptions, dosing, or treatment decisions.

- Any non-dental topics: food/recipes (e.g., "borscht recipe"), weather, tech, finance, entertainment, casual chat, etc.

- Giving medical advice beyond general oral hygiene and explanations of already scheduled procedures.

RESPONSE STYLE

- Brief and focused (2–6 sentences), no small talk, no emojis.

- Do not exceed the asked scope or the allowed domain.

- If information is missing, ask only for dental/patient-status clarifications.

PATIENT CONTEXT (CRITICAL - when provided):
You have access to PATIENT CONTEXT with the patient's name, email, phone, procedures, appointments, treatment plans, invoices, and assigned doctor(s).

STRICT RULES - NO HALLUCINATIONS ALLOWED:
1. USE ONLY the information EXACTLY as provided in PATIENT CONTEXT
2. DO NOT invent, add, or assume ANY information that is NOT explicitly in the context
3. DO NOT add details like times, locations, addresses, or phone numbers if they are NOT in the context
4. DO NOT combine information from different sources - use ONLY what is in PATIENT CONTEXT
5. If information is missing from context, say "This information is not available in your records" or "I don't have this information"
6. If asked about appointments and context shows only dates without times - DO NOT invent times like "10:00" or "14:00"
7. If asked about appointments and context shows no location - DO NOT invent locations like "клиника на ул. Пушкина"
8. If procedures are listed without times - DO NOT add times to appointments
9. NEVER guess or assume information - ONLY use what is explicitly provided

WHEN PATIENT CONTEXT IS PROVIDED:
- DO NOT ask questions like "What would you like to know?" - GIVE DIRECT INFORMATION from the context
- Use ONLY the exact information available in the context
- If asked "как меня зовут?" or "what is my name?" - IMMEDIATELY tell them their name from PATIENT NAME in context (ONLY if it exists)
- If asked about procedures: List ONLY procedures from PROCEDURES section with EXACTLY the information provided (title, status, dates IF provided, descriptions IF provided)
- If asked about appointments: List ONLY appointments from APPOINTMENTS section with EXACTLY the information provided (title, date IF provided, time IF provided, location IF provided)
- If asked "у меня есть тритменты?" or "do I have treatments?" - Tell them about TREATMENT PLANS from context (ONLY if they exist)
- If asked "у меня есть инвойсы?" or "do I have invoices?" - Tell them about INVOICES from context (list them EXACTLY as provided, or say "No invoices" if INVOICES section says "None")
- If asked about discounts/promotions - say "I don't have information about discounts in your account" (this is not in context)
- If asked about their doctor: Tell them ASSIGNED DOCTOR(S) from context (ONLY if provided)
- Be PROACTIVE and INFORMATIVE - but ONLY with information from context
- Answer in the same language the user asked (Russian or English)
- If information is missing, be honest: "I don't have this information in your records"

Examples:
- "как меня зовут?" → "Your name is [PATIENT NAME from context]" (ONLY if PATIENT NAME exists)
- "у меня есть инвойсы?" → If INVOICES section has items: "Yes, you have [X] invoice(s): [list EXACTLY as in context]". If INVOICES section says "None": "No, you don't have any invoices."
- "у меня есть тритменты?" → If TREATMENT PLANS exist: "Yes, you have [X] treatment plan(s): [list EXACTLY as in context]". If not in context: "I don't have information about treatment plans."
- "какие у меня процедуры?" → List ONLY procedures from PROCEDURES section with EXACTLY the information provided (do NOT add times, locations, or other details if not in context)
- "какие у меня аппоинтменты?" → List ONLY appointments from APPOINTMENTS section with EXACTLY the information provided (if no time is provided, DO NOT invent a time; if no location is provided, DO NOT invent a location)

CRITICAL: If you see "APPOINTMENTS:" section with dates but NO times - do NOT add times. If you see appointments with dates but NO locations - do NOT add locations. Use ONLY what is explicitly provided.

DO NOT respond with "What would you like to know?" - GIVE THE INFORMATION DIRECTLY, but ONLY from context.`,
        },
      });
    }

    // Get patient context if user is a patient
    let patientContext = "";
    if (role === "patient") {
      try {
        const authPayload = await getAuthPayload(req);
        if (authPayload?.role === "patient" && authPayload?.userId) {
          const patientId = authPayload.userId;
          
          // Get patient data including invoices
          const [patient, plans, appointments, doctorLinks, invoices] = await Promise.all([
            prisma.patient.findUnique({
              where: { id: patientId },
              select: { name: true, email: true, phone: true },
            }),
            prisma.treatmentPlan.findMany({
              where: { patientId },
              include: {
                procedures: {
                  select: {
                    title: true,
                    description: true,
                    status: true,
                    scheduledDate: true,
                    completedDate: true,
                  },
                  orderBy: { createdAt: "desc" },
                },
              },
              orderBy: { createdAt: "desc" },
            }),
            prisma.appointment.findMany({
              where: { patientId },
              select: {
                title: true,
                datetime: true,
                location: true,
                type: true,
              },
              orderBy: { datetime: "asc" },
            }),
            prisma.doctorPatient.findMany({
              where: { patientId },
              include: {
                doctor: {
                  select: { name: true, email: true },
                },
              },
            }),
            // Get invoices via procedures
            prisma.procedure.findMany({
              where: {
                treatmentPlan: {
                  patientId: patientId,
                },
                invoice: {
                  isNot: null,
                },
              },
              include: {
                invoice: {
                  select: {
                    id: true,
                    amount: true,
                    status: true,
                    createdAt: true,
                    paidAt: true,
                  },
                },
                treatmentPlan: {
                  select: {
                    title: true,
                  },
                },
              },
            }),
          ]);

          // Build patient context - clear and structured
          const contextParts: string[] = [];
          
          if (patient) {
            contextParts.push(`PATIENT NAME: ${patient.name}`);
            contextParts.push(`EMAIL: ${patient.email}`);
            if (patient.phone) {
              contextParts.push(`PHONE: ${patient.phone}`);
            }
          }

          if (doctorLinks.length > 0) {
            const doctors = doctorLinks.map((link) => link.doctor.name).join(", ");
            contextParts.push(`ASSIGNED DOCTOR(S): ${doctors}`);
          }

          if (plans.length > 0) {
            contextParts.push(`\nTREATMENT PLANS: ${plans.length} active plan(s)`);
            plans.forEach((plan, idx) => {
              contextParts.push(`  ${idx + 1}. ${plan.title} (Status: ${plan.status})`);
            });
          }

          // Collect all procedures from all plans
          const allProcedures: any[] = [];
          plans.forEach((plan) => {
            plan.procedures.forEach((proc) => {
              allProcedures.push({ ...proc, planTitle: plan.title });
            });
          });

          if (allProcedures.length > 0) {
            contextParts.push("\nPROCEDURES:");
            allProcedures.forEach((proc, idx) => {
              contextParts.push(`  ${idx + 1}. ${proc.title}`);
              if (proc.description) {
                contextParts.push(`     Description: ${proc.description}`);
              }
              contextParts.push(`     Status: ${proc.status}`);
              if (proc.completedDate) {
                contextParts.push(`     Completed: ${proc.completedDate.toLocaleDateString()}`);
              }
              if (proc.scheduledDate) {
                contextParts.push(`     Scheduled: ${proc.scheduledDate.toLocaleDateString()}`);
              }
              contextParts.push(`     Treatment Plan: ${proc.planTitle}`);
            });
          }

          if (appointments.length > 0) {
            contextParts.push("\nAPPOINTMENTS:");
            appointments.slice(0, 5).forEach((apt, idx) => {
              const date = new Date(apt.datetime);
              contextParts.push(`  ${idx + 1}. ${apt.title}`);
              contextParts.push(`     Date: ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
              if (apt.location) {
                contextParts.push(`     Location: ${apt.location}`);
              }
              if (apt.type) {
                contextParts.push(`     Type: ${apt.type}`);
              }
            });
            if (appointments.length > 5) {
              contextParts.push(`  ... and ${appointments.length - 5} more appointments`);
            }
          }

          if (invoices.length > 0) {
            contextParts.push("\nINVOICES:");
            invoices.forEach((inv, idx) => {
              const invoice = inv.invoice;
              if (invoice) {
                contextParts.push(`  ${idx + 1}. ${inv.title || "Procedure Invoice"}`);
                contextParts.push(`     Amount: $${invoice.amount.toFixed(2)}`);
                contextParts.push(`     Status: ${invoice.status.toUpperCase()}`);
                if (invoice.status === "paid" && invoice.paidAt) {
                  contextParts.push(`     Paid on: ${new Date(invoice.paidAt).toLocaleDateString()}`);
                } else {
                  contextParts.push(`     Created: ${new Date(invoice.createdAt).toLocaleDateString()}`);
                }
                if (inv.treatmentPlan) {
                  contextParts.push(`     Treatment Plan: ${inv.treatmentPlan.title}`);
                }
              }
            });
          } else {
            contextParts.push("\nINVOICES: None");
          }

          if (contextParts.length > 0) {
            patientContext = "\n\n=== PATIENT CONTEXT ===\n" + 
              "IMPORTANT: Use this information to answer questions about the patient's procedures, appointments, and treatment. " +
              "When asked 'какие у меня процедуры?' or 'what procedures do I have?', list the procedures from below.\n\n" +
              contextParts.join("\n") + 
              "\n\nWhen answering questions about procedures, appointments, or treatment, use the information above.";
          }
        }
      } catch (error) {
        console.error("Error fetching patient context:", error);
        // Continue without context if there's an error
      }
    }

    // Check for actions first (only for patients)
    let actionIntent = null;
    let pendingAction = null;
    
    if (role === "patient") {
      try {
        const authPayload = await getAuthPayload(req);
        if (authPayload?.role === "patient" && authPayload?.userId) {
          const patientId = authPayload.userId;
          
          // Get appointments for intent detection
          const appointments = await prisma.appointment.findMany({
            where: { patientId },
            select: {
              id: true,
              title: true,
              datetime: true,
              location: true,
              type: true,
            },
            orderBy: { datetime: "asc" },
          });

          // Check if there's a pending action in conversation history
          const lastAssistantMessage = conversationHistory
            .filter(msg => msg.role === "assistant")
            .slice(-1)[0];
          
          if (lastAssistantMessage) {
            // Try to extract pending action from last assistant message (check all lines)
            const lines = lastAssistantMessage.content.split('\n');
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line.trim());
                if (parsed.type === "pending_action") {
                  pendingAction = parsed;
                  break;
                }
              } catch (e) {
                // Not JSON, continue
              }
            }
          }

          // If user confirmed, use pending action
          const confirmationKeywords = ["да", "yes", "подтверждаю", "confirm", "согласен", "ок", "ok", "хорошо", "сделай", "do it"];
          const isConfirmation = confirmationKeywords.some(keyword => 
            message.toLowerCase().trim() === keyword || 
            message.toLowerCase().includes(keyword)
          );
          
          if (isConfirmation && pendingAction) {
            // User confirmed pending action - return action JSON
            return NextResponse.json({
              response: JSON.stringify({
                type: "action",
                action: pendingAction.action,
                appointmentId: pendingAction.appointmentId,
                newDateTime: pendingAction.newDateTime,
                appointmentTitle: pendingAction.appointmentTitle,
              }),
              actionIntent: pendingAction,
            });
          }

          // Detect new intent if no pending action
          if (!pendingAction) {
            actionIntent = await detectIntent(message, appointments, patientContext);
          }
        }
      } catch (error) {
        console.error("Error detecting intent:", error);
      }
    }

    // Generate AI response using OpenAI with patient context and conversation history
    const response = await generateAIResponse(
      message, 
      settings.prompt + patientContext, 
      role,
      conversationHistory,
      actionIntent
    );

    return NextResponse.json({ response, actionIntent });
  } catch (error: any) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response", details: error?.message },
      { status: 500 }
    );
  }
}

interface ActionIntent {
  type: "reschedule_appointment" | "cancel_appointment" | "create_appointment" | "general_question" | null;
  appointmentId?: string;
  appointmentTitle?: string;
  newDateTime?: string;
  confidence?: number;
  requiresConfirmation?: boolean;
}

async function detectIntent(
  message: string,
  appointments: any[],
  patientContext: string
): Promise<ActionIntent | null> {
  try {
    // Simple keyword-based detection first (can be enhanced with AI later)
    const lowerMessage = message.toLowerCase();
    
    // Check for reschedule intent
    const rescheduleKeywords = ["перенести", "reschedule", "изменить дату", "change date", "перенеси", "перенести на"];
    const hasReschedule = rescheduleKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Check for cancel intent
    const cancelKeywords = ["отменить", "cancel", "удалить", "delete", "отмени"];
    const hasCancel = cancelKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasReschedule) {
      // Try to extract date from message
      const dateMatch = message.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
      let newDateTime: string | undefined;
      
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const fullYear = year.length === 2 ? `20${year}` : year;
        newDateTime = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T10:00:00`;
      }
      
      // Find appointment by keywords in title
      const cleaningKeywords = ["чистка", "cleaning", "чистка зубов"];
      const appointment = appointments.find(apt => 
        cleaningKeywords.some(keyword => apt.title.toLowerCase().includes(keyword))
      ) || appointments[0]; // Fallback to first appointment
      
      if (appointment) {
        return {
          type: "reschedule_appointment",
          appointmentId: appointment.id,
          appointmentTitle: appointment.title,
          newDateTime,
          confidence: 0.8,
          requiresConfirmation: true,
        };
      }
    }
    
    if (hasCancel) {
      // Find appointment by keywords
      const cleaningKeywords = ["чистка", "cleaning", "чистка зубов"];
      const appointment = appointments.find(apt => 
        cleaningKeywords.some(keyword => apt.title.toLowerCase().includes(keyword))
      ) || appointments[0];
      
      if (appointment) {
        return {
          type: "cancel_appointment",
          appointmentId: appointment.id,
          appointmentTitle: appointment.title,
          confidence: 0.8,
          requiresConfirmation: true,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("Intent detection error:", error);
    return null;
  }
}

async function generateAIResponse(
  userMessage: string,
  systemPrompt: string,
  role: "patient" | "admin",
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [],
  actionIntent: ActionIntent | null = null
): Promise<string> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build messages array with system prompt, conversation history, and current message
    let enhancedSystemPrompt = systemPrompt;
    let shouldReturnAction = false;
    
    // Check if user is confirming a previous action intent
    const confirmationKeywords = ["да", "yes", "подтверждаю", "confirm", "согласен", "ок", "ok", "хорошо", "сделай", "do it"];
    const isConfirmation = confirmationKeywords.some(keyword => 
      userMessage.toLowerCase().trim() === keyword || 
      userMessage.toLowerCase().includes(keyword)
    );
    
    // If action intent detected, add instructions for confirmation
    if (actionIntent && actionIntent.type === "reschedule_appointment" && actionIntent.requiresConfirmation) {
      // Store pending action in response
      const pendingActionJson = JSON.stringify({
        type: "pending_action",
        action: "reschedule_appointment",
        appointmentId: actionIntent.appointmentId,
        newDateTime: actionIntent.newDateTime,
        appointmentTitle: actionIntent.appointmentTitle,
      });
      
      enhancedSystemPrompt += `\n\nACTION DETECTED: User wants to reschedule appointment "${actionIntent.appointmentTitle}" to ${actionIntent.newDateTime || "new date"}.\nRespond with: "Вы имеете в виду аппоинтмент "${actionIntent.appointmentTitle}"? Подтвердите, чтобы перенести его."\n\nIMPORTANT: After your text response, append this JSON on a new line: ${pendingActionJson}`;
    } else if (actionIntent && actionIntent.type === "cancel_appointment" && actionIntent.requiresConfirmation) {
      // Store pending action in response
      const pendingActionJson = JSON.stringify({
        type: "pending_action",
        action: "cancel_appointment",
        appointmentId: actionIntent.appointmentId,
        appointmentTitle: actionIntent.appointmentTitle,
      });
      
      enhancedSystemPrompt += `\n\nACTION DETECTED: User wants to cancel appointment "${actionIntent.appointmentTitle}".\nRespond with: "Вы хотите отменить аппоинтмент "${actionIntent.appointmentTitle}"? Подтвердите, чтобы отменить."\n\nIMPORTANT: After your text response, append this JSON on a new line: ${pendingActionJson}`;
    }
    
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: enhancedSystemPrompt },
    ];

    // Add conversation history (convert assistant -> assistant for OpenAI API)
    conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    });

    // Add current user message
    messages.push({ role: "user", content: userMessage });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using gpt-4o-mini for cost efficiency, can be changed to gpt-4 if needed
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    // Try to extract pending action JSON from response
    try {
      // Look for JSON in response (might be at the end)
      const jsonMatch = response.match(/\{[\s\S]*"type"\s*:\s*"pending_action"[\s\S]*\}/);
      if (jsonMatch) {
        const pendingAction = JSON.parse(jsonMatch[0]);
        // Remove JSON from response text
        const textResponse = response.replace(jsonMatch[0], "").trim();
        // Return text with pending action stored
        return textResponse + "\n" + JSON.stringify(pendingAction);
      }
    } catch (error) {
      // Not a pending action, continue with normal response
    }

    return response;
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    throw new Error(`Failed to generate AI response: ${error?.message || "Unknown error"}`);
  }
}

