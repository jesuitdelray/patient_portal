import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function POST(req: NextRequest) {
  console.log("[API] POST /appointments/create - Request received");
  console.log("[API] Request URL:", req.url);
  console.log("[API] Request method:", req.method);
  
  try {
    const body = await req.json();
    console.log("[API] Request body:", JSON.stringify(body, null, 2));
    
    const { patientId: bodyPatientId, title, datetime, location, type, treatmentPlanId } =
      body;

    console.log("[API] Extracted fields:", {
      bodyPatientId,
      title,
      datetime,
      location,
      type,
      treatmentPlanId,
    });

    // Get patientId from auth (for patient requests) or from body (for admin requests)
    let patientId: string | undefined = bodyPatientId;
    console.log("[API] Initial patientId from body:", patientId);
    
    // If no patientId in body, try to get from auth (patient creating their own appointment)
    if (!patientId) {
      console.log("[API] No patientId in body, trying to get from auth...");
      try {
        const authPayload = await getAuthPayload(req);
        console.log("[API] Auth payload:", authPayload);
        
        if (authPayload?.role === "patient" && authPayload?.userId) {
          patientId = authPayload.userId;
          console.log("[API] Got patientId from auth:", patientId);
        } else {
          console.error("[API] Auth failed or user is not a patient:", authPayload);
          return new NextResponse(
            JSON.stringify({ error: "Unauthorized: Patient authentication required" }),
            {
              status: 401,
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        }
      } catch (e: any) {
        console.error("[API] Auth error:", e);
        console.error("[API] Auth error message:", e.message);
        console.error("[API] Auth error stack:", e.stack);
        return new NextResponse(
          JSON.stringify({ error: "Unauthorized: Authentication failed" }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    console.log("[API] Validating required fields...");
    if (!patientId || !title || !datetime || !type) {
      console.error("[API] Missing required fields:", {
        hasPatientId: !!patientId,
        hasTitle: !!title,
        hasDatetime: !!datetime,
        hasType: !!type,
      });
      return new NextResponse(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("[API] All required fields present");
    
    // Validate datetime format
    console.log("[API] Validating datetime:", datetime);
    const appointmentDate = new Date(datetime);
    console.log("[API] Parsed date:", appointmentDate);
    console.log("[API] Date isValid:", !isNaN(appointmentDate.getTime()));
    
    if (isNaN(appointmentDate.getTime())) {
      console.error("[API] Invalid datetime format:", datetime);
      return new NextResponse(
        JSON.stringify({ error: "Invalid datetime format" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("[API] Creating appointment in database...");
    console.log("[API] Appointment data:", {
      patientId,
      title,
      datetime: appointmentDate,
      location: location || null,
      type,
    });

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        title,
        datetime: appointmentDate,
        location: location || null,
        type,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log("[API] Appointment created successfully:", appointment.id);

    // If treatmentPlanId is provided, link it (we'll update schema later if needed)
    // For now, we'll just create the appointment

    // Emit socket event for real-time updates
    console.log("[API] Emitting socket events...");
    const io = (global as any).__io;
    if (io) {
      console.log("[API] Socket.IO instance found");
      const by = bodyPatientId ? "doctor" : "patient";
      console.log("[API] Appointment created by:", by);
      
      // Emit appointment:new for new appointments
      io.to(`patient:${patientId}`).emit("appointment:new", {
        appointment,
        by,
      });
      console.log("[API] Emitted to patient room:", `patient:${patientId}`);
      
      io.to("admin").emit("appointment:new", {
        appointment,
        by: "doctor",
      });
      console.log("[API] Emitted to admin room");
    } else {
      console.warn("[API] Socket.IO instance not found, skipping socket events");
    }

    const response = {
      appointment,
    };
    console.log("[API] Sending success response");
    console.log("[API] Response data:", JSON.stringify(response, null, 2));

    return new NextResponse(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("[API] Create appointment error:", error);
    console.error("[API] Error name:", error.name);
    console.error("[API] Error message:", error.message);
    console.error("[API] Error stack:", error.stack);
    
    return new NextResponse(
      JSON.stringify({ error: error.message || "Failed to create appointment" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
