import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import OpenAI from "openai";
import { getIO } from "@/lib/io";

// Intent detection for appointment actions
interface DetectedIntent {
  type: "reschedule_appointment" | "cancel_appointment" | "create_appointment" | "general_question" | null;
  appointmentId?: string;
  appointmentTitle?: string;
  newDateTime?: string;
  confidence?: number;
  requiresConfirmation?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { message, patientContext } = await req.json();
    
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // Get patient ID from auth
    const authPayload = await getAuthPayload(req);
    if (!authPayload || authPayload.role !== "patient" || !authPayload.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const patientId = authPayload.userId;

    // Get patient's appointments for context
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

    // Detect intent using AI
    const intent = await detectIntent(message, appointments, patientContext);

    return NextResponse.json({ intent });
  } catch (error: any) {
    console.error("AI actions error:", error);
    return NextResponse.json(
      { error: "Failed to process action", details: error?.message },
      { status: 500 }
    );
  }
}

async function detectIntent(
  message: string,
  appointments: any[],
  patientContext: string
): Promise<DetectedIntent> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Format appointments for AI
    const appointmentsList = appointments.map((apt, idx) => {
      const date = new Date(apt.datetime);
      return {
        index: idx + 1,
        id: apt.id,
        title: apt.title,
        datetime: date.toISOString(),
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        location: apt.location || "N/A",
      };
    }).slice(0, 10); // Limit to 10 most recent

    const systemPrompt = `You are an intent detection system for a dental clinic chat assistant. Your job is to analyze user messages and detect if they want to:
1. Reschedule an appointment (change date/time)
2. Cancel an appointment
3. Create a new appointment
4. General question (no action needed)

Available appointments:
${JSON.stringify(appointmentsList, null, 2)}

Patient context:
${patientContext || "No additional context"}

Analyze the user message and respond with JSON only:
{
  "type": "reschedule_appointment" | "cancel_appointment" | "create_appointment" | "general_question" | null,
  "appointmentId": "appointment id if type is reschedule/cancel",
  "appointmentTitle": "appointment title if identified",
  "newDateTime": "ISO datetime string if reschedule (extract from message)",
  "confidence": 0.0-1.0,
  "requiresConfirmation": true/false
}

Rules:
- If user mentions "перенести", "reschedule", "change date", "изменить дату" - type is "reschedule_appointment"
- If user mentions "отменить", "cancel", "удалить" - type is "cancel_appointment"
- If user mentions "записаться", "book", "schedule" - type is "create_appointment"
- Extract date from message (support Russian and English dates)
- Match appointment by title keywords (e.g., "чистка зубов" matches "Teeth Cleaning")
- If confidence < 0.7, set requiresConfirmation: true
- Return null type if unclear`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return { type: null, confidence: 0 };
    }

    const intent = JSON.parse(response) as DetectedIntent;
    
    // Validate and enhance intent
    if (intent.type === "reschedule_appointment" && intent.appointmentId) {
      // Find the appointment
      const appointment = appointments.find((apt) => apt.id === intent.appointmentId);
      if (appointment) {
        intent.appointmentTitle = appointment.title;
      }
    }

    return intent;
  } catch (error: any) {
    console.error("Intent detection error:", error);
    return { type: null, confidence: 0 };
  }
}

