/* Next.js custom server with built-in Socket.IO on the same port */
const http = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

// For making HTTP requests to AI endpoint
async function fetch(url, options) {
  const httpModule = url.startsWith("https") ? require("https") : require("http");
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = httpModule.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
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
    req.on("error", reject);
    if (options?.body) {
      req.write(options.body);
    }
    req.end();
  });
}

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const prisma = new PrismaClient();

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
      try {
        if (!patientId || !sender || !content) {
          ack && ack({ ok: false, error: "invalid_payload" });
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
        
        // If message is from patient, send to AI and get action
        if (sender === "patient") {
          try {
            // Get conversation history for context
            const recentMessages = await prisma.message.findMany({
              where: { patientId },
              orderBy: { createdAt: "desc" },
              take: 10,
            });
            
            const conversationHistory = recentMessages
              .reverse()
              .map((m) => ({
                role: m.sender === "patient" ? "user" : "assistant",
                content: m.content,
              }));
            
            // Call AI endpoint to get action
            const port = process.env.PORT ? Number(process.env.PORT) : 3001;
            const baseUrl = `http://localhost:${port}`;
            
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
              
              // Create a bot message with just the action name
              const botMessage = await prisma.message.create({
                data: {
                  patientId,
                  sender: "doctor",
                  content: actionData.action || "general_response",
                },
              });
              
              console.log("[Server] Created bot message with action:", botMessage.id, botMessage.content);
              
              // Send bot message to patient room
              io.to(`patient:${patientId}`).emit("message:new", { message: botMessage });
              console.log("[Server] Emitted message:new to patient room:", `patient:${patientId}`);
              
              // Send to admin room using broadcast to avoid sending to sender
              socket.broadcast.to("admin").emit("message:new", { message: botMessage });
              
              // Also send action data for frontend to handle
              io.to(`patient:${patientId}`).emit("ai:action", {
                action: actionData.action,
                data: actionData.data,
                messageId: botMessage.id,
              });
            } else {
              const errorText = await aiResponse.text();
              console.error("[Server] AI endpoint error:", errorText);
            }
          } catch (aiError) {
            console.error("Error calling AI:", aiError);
            // Don't fail the message send if AI fails
          }
        }
        
        ack && ack({ ok: true, message });
      } catch (e) {
        console.error("Message send error:", e);
        ack && ack({ ok: false, error: "server_error" });
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
