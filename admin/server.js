/* Next.js custom server with built-in Socket.IO on the same port */
const http = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

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
    // Automatically join admin room for all connections (admin panel connections)
    socket.join("admin");

    socket.on("join", ({ patientId, doctorId }) => {
      if (patientId) socket.join(`patient:${patientId}`);
      if (doctorId) socket.join(`doctor:${doctorId}`);
      socket.emit("ready", { ok: true });
    });

    socket.on("message:send", async ({ patientId, sender, content }, ack) => {
      try {
        if (!patientId || !sender || !content) {
          ack && ack({ ok: false, error: "invalid_payload" });
          return;
        }
        const message = await prisma.message.create({
          data: { patientId, sender, content },
        });
        // Send to patient room (for patient app)
        io.to(`patient:${patientId}`).emit("message:new", { message });
        // Also send to admin room (for admin panel)
        io.to("admin").emit("message:new", { message });
        ack && ack({ ok: true, message });
      } catch (e) {
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
        // Notify both patient and admin rooms
        io.to(`patient:${patientId}`).emit("messages:cleared", { patientId });
        io.to("admin").emit("messages:cleared", { patientId });
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
