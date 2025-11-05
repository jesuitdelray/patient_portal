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

WHEN PATIENT CONTEXT IS PROVIDED:
- DO NOT ask questions like "What would you like to know?" - GIVE DIRECT INFORMATION from the context
- Use ALL available information from the context to answer questions
- If asked "как меня зовут?" or "what is my name?" - IMMEDIATELY tell them their name from PATIENT NAME in context
- If asked about procedures: IMMEDIATELY list all procedures from the context with their status, dates, and descriptions
- If asked about appointments: IMMEDIATELY list all appointments with dates, times, and locations
- If asked "у меня есть тритменты?" or "do I have treatments?" - IMMEDIATELY tell them about their TREATMENT PLANS from context
- If asked "у меня есть инвойсы?" or "do I have invoices?" - IMMEDIATELY tell them about their INVOICES from context (list them if any, or say "No invoices" if none)
- If asked about discounts/promotions - say "I don't have information about discounts in your account" (this is not in context)
- If asked about their doctor: IMMEDIATELY tell them their assigned doctor(s) from the context
- Be PROACTIVE and INFORMATIVE - provide the actual information, not questions
- Answer in the same language the user asked (Russian or English)

Examples:
- "как меня зовут?" → "Your name is [PATIENT NAME from context]"
- "у меня есть инвойсы?" → If invoices exist: "Yes, you have [X] invoice(s): [list them]". If none: "No, you don't have any invoices."
- "у меня есть тритменты?" → "Yes, you have [X] treatment plan(s): [list them from TREATMENT PLANS]"
- "какие у меня процедуры?" → List all procedures from context

DO NOT respond with "What would you like to know?" - GIVE THE INFORMATION DIRECTLY.`,
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

    // Generate AI response using OpenAI with patient context and conversation history
    const response = await generateAIResponse(
      message, 
      settings.prompt + patientContext, 
      role,
      conversationHistory
    );

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response", details: error?.message },
      { status: 500 }
    );
  }
}

async function generateAIResponse(
  userMessage: string,
  systemPrompt: string,
  role: "patient" | "admin",
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<string> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build messages array with system prompt, conversation history, and current message
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
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

    return response;
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    throw new Error(`Failed to generate AI response: ${error?.message || "Unknown error"}`);
  }
}

