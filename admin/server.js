/* Next.js custom server with built-in Socket.IO on the same port */
const http = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

// For making HTTP requests to AI endpoint
async function fetch(url, options) {
  const httpModule = url.startsWith("https")
    ? require("https")
    : require("http");
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = httpModule.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (url.startsWith("https") ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options?.method || "GET",
        headers: options?.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: async () => JSON.parse(data),
            text: async () => data,
          });
        });
      }
    );
    req.on("error", (error) => {
      console.error("[Server] Fetch error:", error);
      reject(error);
    });
    if (options?.body) {
      req.write(options.body);
    }
    req.end();
  });
}

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const datasourceUrl =
  process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  log: ["error", "warn"],
  ...(datasourceUrl ? { datasourceUrl } : {}),
});

// Map actions to titles and fetch data from database
async function getActionData(action, patientId, actionPayload = {}, context = {}) {
  const actionTitles = {
    view_next_appointment: "Next appointment",
    reschedule_appointment: "Reschedule appointment",
    book_appointment: "", // No title - button will show the action
    view_upcoming_appointments: "Upcoming appointments",
    view_remaining_procedures: "Remaining procedures",
    view_treatment_progress: "Treatment progress",
    send_message_to_doctor: "Message sent to your dentist",
    send_message_to_front_desk: null,
    view_unpaid_invoices: "Unpaid invoices",
    view_past_invoices: "Past invoices",
    view_all_invoices: "Invoices",
    view_procedure_price: "Procedure price",
    view_price_list: "", // No title - button will show the action
    view_treatment_plan_details: "Treatment plans",
    view_next_procedure: "Next procedure",
    view_completed_treatments: "Completed treatments",
    remind_appointment: "Appointment reminder sent",
    cancel_appointment: "Select appointment to cancel",
    view_promotions: "", // No title - button will show the action
    view_available_slots: "Available time slots",
    add_to_calendar: "Added to calendar",
    view_messages: "Messages",
    update_contact_info: "Your contact information",
    view_procedure_details: "Procedure details",
    download_invoice: "Invoice download",
    view_dental_history: "Dental history",
    view_next_treatment_step: "Next treatment step",
    view_assigned_doctor: "Assigned doctor",
    check_appointment_procedures: "Appointment procedures",
    view_weekend_slots: "Weekend available slots",
    general_response:
      "I’m here to help! Tell me what you’d like to do.\n\nExamples:\n• “Provide me the invoices list”\n• “Show my upcoming appointments”",
  };

  const emptyStateMessages = {
    view_next_appointment: "No appointments found",
    view_upcoming_appointments: "No appointments found",
    view_remaining_procedures: "No remaining procedures",
    view_unpaid_invoices: "No unpaid invoices",
    view_past_invoices: "Sorry, but we don't have any past invoices yet.",
    view_all_invoices: "No invoices found",
    view_treatment_plan_details: "No treatment plans found",
    view_next_procedure: "No upcoming procedures",
    view_completed_treatments: "No completed treatments",
    view_assigned_doctor: "No assigned doctor",
    view_promotions: "No promotions available",
    view_available_slots: "No available time slots",
    view_messages: "No messages found",
    cancel_appointment: "You don't have any appointments to cancel.",
    update_contact_info: "We could not load your contact information.",
    view_procedure_details: "No procedures found",
    view_dental_history: "No dental history on file",
    view_next_treatment_step: "No upcoming treatment steps",
    check_appointment_procedures: "No procedures in this appointment",
    view_completed_treatments: "No completed treatments",
  };

  const rawTitle = actionTitles[action];
  const title =
    rawTitle === undefined ? "Response" : rawTitle === null ? null : rawTitle;
  let data = null;

  try {
    switch (action) {
      case "view_procedure_price": {
        const queryFromPayload =
          actionPayload?.procedureName ||
          actionPayload?.procedure ||
          actionPayload?.name ||
          actionPayload?.title ||
          actionPayload?.query ||
          "";
        const queryFromMessage = extractProcedureQuery(context.message);
        const searchTerm = (queryFromPayload || queryFromMessage || "").trim();

        const rawTerms = searchTerm
          ? searchTerm
              .split(/(?:,|&|\/|\band\b|\+)+/i)
              .map((term) =>
                term
                  .replace(/(?:how much|cost|price|for|the|procedure|\?)/gi, "")
                  .trim()
              )
              .filter(Boolean)
          : [];

        const termsToSearch =
          rawTerms.length > 0 ? rawTerms : searchTerm ? [searchTerm] : [];

        const uniqueMatches = new Map();

        if (termsToSearch.length > 0) {
          for (const term of termsToSearch) {
            const termMatches = await prisma.priceList.findMany({
              where: {
                isActive: true,
                OR: [
                  {
                    title: {
                      contains: term,
                      mode: "insensitive",
                    },
                  },
                  {
                    description: {
                      contains: term,
                      mode: "insensitive",
                    },
                  },
                ],
              },
              orderBy: [{ order: "asc" }, { title: "asc" }],
              take: 5,
            });

            for (const item of termMatches) {
              if (!uniqueMatches.has(item.id)) {
                uniqueMatches.set(item.id, item);
              }
            }
          }
        } else {
          const fallback = await prisma.priceList.findMany({
            where: { isActive: true },
            orderBy: [{ order: "asc" }, { title: "asc" }],
            take: 10,
          });
          fallback.forEach((item) => uniqueMatches.set(item.id, item));
        }

        let results = Array.from(uniqueMatches.values());

        if (searchTerm && results.length === 0) {
          const allItems = await prisma.priceList.findMany({
            where: { isActive: true },
            orderBy: [{ order: "asc" }, { title: "asc" }],
          });
          const lowerTerm = searchTerm.toLowerCase();
          results = allItems.filter((item) =>
            lowerTerm
              .split(/\s+/)
              .every((token) => item.title.toLowerCase().includes(token))
          );
        }

        data = {
          query: searchTerm || null,
          terms: termsToSearch,
          matches: results,
        };
        break;
      }

      case "send_message_to_front_desk": {
        const rawMessage =
          typeof actionPayload?.message === "string"
            ? actionPayload.message.trim()
            : "";
        data = {
          prompt:
            actionPayload?.prompt ||
            "Which message do you want to send to the front desk?",
          initialMessage: rawMessage || null,
          requireInput: !rawMessage,
        };
        break;
      }

      case "view_available_slots": {
        const preferredDate = actionPayload?.preferredDate
          ? new Date(actionPayload.preferredDate)
          : null;
        data = await generateAvailableSlots(preferredDate);
        break;
      }

      case "cancel_appointment": {
        const now = new Date();
        const appointmentToCancel = await prisma.appointment.findFirst({
          where: {
            patientId,
            datetime: { gte: now },
          },
          orderBy: { datetime: "asc" },
          include: {
            procedures: true,
          },
        });
        data = appointmentToCancel ? [appointmentToCancel] : [];
        break;
      }

      case "update_contact_info": {
        const contact = await prisma.patient.findUnique({
          where: { id: patientId },
          select: {
            name: true,
            email: true,
            phone: true,
          },
        });
        data = contact
          ? {
              ...contact,
              instructions:
                "Let us know if anything is outdated and we will update it for you.",
            }
          : null;
        break;
      }

      case "view_procedure_details": {
        const procedures = await prisma.procedure.findMany({
          where: {
            treatmentPlan: {
              patientId,
            },
          },
          include: {
            treatmentPlan: true,
          },
          orderBy: [
            { status: "asc" },
            { scheduledDate: "asc" },
            { createdAt: "asc" },
          ],
        });
        data = procedures;
        break;
      }

      case "view_dental_history": {
        const history = await prisma.procedure.findMany({
          where: {
            treatmentPlan: {
              patientId,
            },
          },
          include: {
            treatmentPlan: true,
          },
          orderBy: { completedDate: "desc" },
        });
        data = history;
        break;
      }

      case "view_treatment_plan_details":
        data = await prisma.treatmentPlan.findMany({
          where: { patientId },
          include: {
            procedures: {
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        break;

      case "view_next_appointment": {
        const now = new Date();
        data = await prisma.appointment.findFirst({
          where: {
            patientId,
            datetime: { gte: now },
          },
          orderBy: { datetime: "asc" },
        });
        break;
      }

      case "view_upcoming_appointments": {
        const now = new Date();
        data = await prisma.appointment.findMany({
          where: {
            patientId,
            datetime: { gte: now },
          },
          orderBy: { datetime: "asc" },
        });
        break;
      }

      case "view_remaining_procedures":
        const treatmentPlans = await prisma.treatmentPlan.findMany({
          where: { patientId },
          include: {
            procedures: {
              where: {
                status: { not: "completed" },
              },
              orderBy: { scheduledDate: "asc" },
            },
          },
        });
        data = treatmentPlans.flatMap((plan) => plan.procedures);
        break;

      case "view_unpaid_invoices":
        // Get all procedures for this patient's treatment plans
        const patientProcedures = await prisma.procedure.findMany({
          where: {
            treatmentPlan: {
              patientId,
            },
          },
          select: {
            id: true,
          },
        });
        const procedureIds = patientProcedures.map((p) => p.id);

        data = await prisma.invoice.findMany({
          where: {
            status: "unpaid",
            procedureId: {
              in: procedureIds,
            },
          },
          include: {
            procedure: {
              include: {
                treatmentPlan: true,
              },
            },
          },
        });
        break;

      case "view_past_invoices":
        // Get all procedures for this patient's treatment plans
        const patientProceduresPaid = await prisma.procedure.findMany({
          where: {
            treatmentPlan: {
              patientId,
            },
          },
          select: {
            id: true,
          },
        });
        const procedureIdsPaid = patientProceduresPaid.map((p) => p.id);

        data = await prisma.invoice.findMany({
          where: {
            status: "paid",
            procedureId: {
              in: procedureIdsPaid,
            },
          },
          include: {
            procedure: {
              include: {
                treatmentPlan: true,
              },
            },
          },
          orderBy: { paidAt: "desc" },
        });
        break;

      case "view_all_invoices":
        // Get all procedures for this patient's treatment plans
        const patientProceduresAll = await prisma.procedure.findMany({
          where: {
            treatmentPlan: {
              patientId,
            },
          },
          select: {
            id: true,
          },
        });
        const procedureIdsAll = patientProceduresAll.map((p) => p.id);

        // Get both paid and unpaid invoices
        data = await prisma.invoice.findMany({
          where: {
            procedureId: {
              in: procedureIdsAll,
            },
          },
          include: {
            procedure: {
              include: {
                treatmentPlan: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        break;

      case "view_completed_treatments":
        data = await prisma.procedure.findMany({
          where: {
            status: "completed",
            treatmentPlan: {
              patientId,
            },
          },
          include: {
            treatmentPlan: true,
          },
          orderBy: { completedDate: "desc" },
        });
        break;

      case "view_next_procedure":
        const nextProcedure = await prisma.procedure.findFirst({
          where: {
            status: { not: "completed" },
            treatmentPlan: {
              patientId,
            },
          },
          include: {
            treatmentPlan: true,
          },
          orderBy: { scheduledDate: "asc" },
        });
        data = nextProcedure;
        break;

      case "view_assigned_doctor":
        const patient = await prisma.patient.findUnique({
          where: { id: patientId },
          include: {
            doctorLinks: {
              include: {
                doctor: true,
              },
            },
          },
        });
        data = patient?.doctorLinks.map((link) => link.doctor) || [];
        break;

      case "view_promotions":
        // Promotions are hardcoded in frontend, return the same structure
        data = [
          {
            id: 1,
            title: "20% Off Teeth Whitening",
            description:
              "Get a brighter smile with our professional teeth whitening service. Limited time offer for existing patients.",
            discount: "20% OFF",
            validUntil: "Dec 31, 2025",
            category: "Cosmetic",
          },
          {
            id: 2,
            title: "Free Dental Checkup",
            description:
              "Book your regular checkup this month and get a complimentary oral health assessment worth $150.",
            discount: "FREE",
            validUntil: "Nov 30, 2025",
            category: "Checkup",
          },
          {
            id: 3,
            title: "Family Package - Save $500",
            description:
              "Bring your family for comprehensive dental care. Special package includes checkups, cleaning, and X-rays for up to 4 members.",
            discount: "$500 OFF",
            validUntil: "Jan 15, 2026",
            category: "Package",
          },
        ];
        break;

      default:
        data = null;
    }
  } catch (error) {
    console.error(`[Server] Error fetching data for action ${action}:`, error);
    data = null;
  }

  // Check if data is empty and use empty state message
  const isEmpty = data === null || (Array.isArray(data) && data.length === 0);
  const finalTitle =
    isEmpty && emptyStateMessages[action] ? emptyStateMessages[action] : title;

  return { title: finalTitle, data, action };
}

function extractProcedureQuery(message) {
  if (!message || typeof message !== "string") return "";
  const patterns = [
    /(price|cost)\s+(?:for|of)\s+(.+?)(\?|$)/i,
    /how much\s+cost\s+(.+?)(\?|$)/i,
    /how much(?: is| does)?(?: the)?\s+(.+?)(?:\s+cost|\?|$)/i,
    /what(?:'s| is)?(?: the)?\s+price\s+of\s+(.+?)(\?|$)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const group = match[2] || match[1];
      if (group) {
        return sanitizeQuery(group);
      }
    }
  }

  return "";
}

function sanitizeQuery(value) {
  return value ? value.replace(/[\?\.,!\n\r]/g, " ").trim() : "";
}

async function generateAvailableSlots(preferredDate) {
  const SLOT_DURATION_MINUTES = 60;
  const WORKING_HOURS = [9, 11, 13, 15, 17];
  const MAX_SLOTS = 6;
  const SEARCH_DAYS = 14;

  const now = new Date();
  const baseStart =
    preferredDate instanceof Date && !Number.isNaN(preferredDate.valueOf())
      ? new Date(preferredDate)
      : new Date();
  if (baseStart < now) {
    baseStart.setTime(now.getTime());
  }
  baseStart.setSeconds(0, 0);

  const horizon = new Date(baseStart);
  horizon.setDate(horizon.getDate() + SEARCH_DAYS);

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      datetime: {
        gte: baseStart,
        lt: horizon,
      },
    },
    select: {
      datetime: true,
    },
  });

  const busySlots = existingAppointments.map((apt) => new Date(apt.datetime));

  const slots = [];

  for (
    let dayOffset = 0;
    dayOffset < SEARCH_DAYS && slots.length < MAX_SLOTS;
    dayOffset++
  ) {
    const currentDay = new Date(baseStart);
    currentDay.setHours(0, 0, 0, 0);
    currentDay.setDate(currentDay.getDate() + dayOffset);

    const weekday = currentDay.getDay();
    if (weekday === 0) {
      // Skip Sundays
      continue;
    }

    for (const hour of WORKING_HOURS) {
      const slotStart = new Date(currentDay);
      slotStart.setHours(hour, 0, 0, 0);

      if (slotStart <= now) {
        continue;
      }

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + SLOT_DURATION_MINUTES);

      const overlaps = busySlots.some((busy) => {
        const diff = Math.abs(busy.getTime() - slotStart.getTime());
        return diff < SLOT_DURATION_MINUTES * 60 * 1000;
      });

      if (overlaps) {
        continue;
      }

      const dateLabel = slotStart.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const timeLabel = slotStart.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        dateLabel,
        timeLabel,
        durationMinutes: SLOT_DURATION_MINUTES,
      });

      if (slots.length >= MAX_SLOTS) {
        break;
      }
    }
  }

  if (slots.length === 0) {
    for (let i = 1; i <= Math.min(5, MAX_SLOTS); i++) {
      const fallbackDay = new Date(baseStart);
      fallbackDay.setDate(fallbackDay.getDate() + i);
      fallbackDay.setHours(10, 0, 0, 0);

      const fallbackEnd = new Date(fallbackDay);
      fallbackEnd.setMinutes(fallbackEnd.getMinutes() + SLOT_DURATION_MINUTES);

      slots.push({
        start: fallbackDay.toISOString(),
        end: fallbackEnd.toISOString(),
        dateLabel: fallbackDay.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        timeLabel: fallbackDay.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        durationMinutes: SLOT_DURATION_MINUTES,
        isEstimated: true,
      });

      if (slots.length >= MAX_SLOTS) {
        break;
      }
    }
  }

  return {
    slots,
    generatedAt: new Date().toISOString(),
    preferredDate: preferredDate
      ? preferredDate.toISOString()
      : null,
  };
}

async function start() {
  await app.prepare();
  const server = http.createServer((req, res) => handle(req, res));

  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io",
  });
  global.__io = io;

  io.on("connection", (socket) => {
    socket.on("join", ({ patientId, doctorId, isAdmin }) => {
      if (patientId) {
        socket.join(`patient:${patientId}`);
        // Leave admin room if patient joins (to avoid duplicate messages)
        socket.leave("admin");
      }
      if (doctorId) {
        socket.join(`doctor:${doctorId}`);
      }
      if (isAdmin) {
        // Only join admin room if explicitly marked as admin
        socket.join("admin");
      }
      socket.emit("ready", { ok: true });
    });

    socket.on("message:send", async ({ patientId, sender, content }, ack) => {
      let ackSent = false;
      const safeAck = (payload) => {
        if (ack && !ackSent) {
          ack(payload);
          ackSent = true;
        }
      };

      try {
        if (!patientId || !sender || !content) {
          safeAck({ ok: false, error: "invalid_payload" });
          return;
        }

        // Save message to database
        const message = await prisma.message.create({
          data: { patientId, sender, content },
        });

        // Send message to patient room (all sockets in room, including sender)
        io.to(`patient:${patientId}`).emit("message:new", { message });

        // Send to admin room using broadcast to avoid sending to sender if they're in admin room
        socket.broadcast.to("admin").emit("message:new", { message });

        // Immediately acknowledge receipt to client before longer AI processing
        safeAck({ ok: true, message });

        // If message is from patient, send to AI and get action
        if (sender === "patient") {
          console.log("[Server] Patient message received, calling AI...");
          try {
            // Get conversation history for context
            const recentMessages = await prisma.message.findMany({
              where: { patientId },
              orderBy: { createdAt: "desc" },
              take: 10,
            });

            const conversationHistory = recentMessages.reverse().map((m) => ({
              role: m.sender === "patient" ? "user" : "assistant",
              content: m.content,
            }));

            // Call AI endpoint to get action
            // Use environment variable for base URL, or construct from request
            const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
              ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
              : process.env.ADMIN_BASE_URL
              ? process.env.ADMIN_BASE_URL
              : process.env.PORT
              ? `http://localhost:${process.env.PORT}`
              : "http://localhost:3001";

            console.log(
              "[Server] Calling AI endpoint:",
              `${baseUrl}/api/ai/chat-action`
            );

            const aiResponse = await fetch(`${baseUrl}/api/ai/chat-action`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                patientId,
                message: content,
                conversationHistory,
              }),
            });

            if (aiResponse.ok) {
              const actionData = await aiResponse.json();
              console.log("[Server] AI response received:", {
                action: actionData.action,
                data: actionData.data,
              });

              // Map action to title and fetch data
              const { title, data, action } = await getActionData(
                actionData.action,
                patientId,
                actionData.data,
                { message: content }
              );

              // Create structured message with action, title and data
              const messageContent = JSON.stringify({ action, title, data });

              const botMessage = await prisma.message.create({
                data: {
                  patientId,
                  sender: "doctor",
                  content: messageContent,
                },
              });

              console.log(
                "[Server] Created bot message with structured data:",
                botMessage.id,
                title
              );

              // Send bot message to patient room
              io.to(`patient:${patientId}`).emit("message:new", {
                message: botMessage,
              });
              console.log(
                "[Server] Emitted message:new to patient room:",
                `patient:${patientId}`
              );

              // Send to admin room using broadcast to avoid sending to sender
              socket.broadcast
                .to("admin")
                .emit("message:new", { message: botMessage });

              // Also send action data for frontend to handle
              io.to(`patient:${patientId}`).emit("ai:action", {
                action: actionData.action,
                data: actionData.data,
                messageId: botMessage.id,
              });
            } else {
              const errorText = await aiResponse.text();
              console.error(
                "[Server] AI endpoint error:",
                aiResponse.status,
                errorText
              );
            }
          } catch (aiError) {
            console.error("[Server] Error calling AI:", aiError);
            console.error("[Server] AI error stack:", aiError.stack);
            // Don't fail the message send if AI fails
          }
        }
      } catch (e) {
        console.error("Message send error:", e);
        safeAck({ ok: false, error: "server_error" });
      }
    });

    socket.on("messages:clear", async ({ patientId }, ack) => {
      try {
        if (!patientId) {
          ack && ack({ ok: false, error: "invalid_payload" });
          return;
        }
        // Delete all messages for this patient
        await prisma.message.deleteMany({
          where: { patientId },
        });
        // Notify patient room
        io.to(`patient:${patientId}`).emit("messages:cleared", { patientId });
        // Notify admin room using broadcast to avoid duplicates
        socket.broadcast.to("admin").emit("messages:cleared", { patientId });
        ack && ack({ ok: true });
      } catch (e) {
        ack && ack({ ok: false, error: "server_error" });
      }
    });
  });

  const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(
      `Admin (Next + Socket.IO) listening on http://localhost:${PORT}`
    );
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
