/* Simple Socket.IO server for chat, runs alongside Next on port 3002 */
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const datasourceUrl =
  process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  log: ["error", "warn"],
  ...(datasourceUrl ? { datasourceUrl } : {}),
});

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  socket.on("join", ({ patientId, doctorId }) => {
    if (patientId) socket.join(`patient:${patientId}`);
    if (doctorId) socket.join(`doctor:${doctorId}`);
    socket.emit("ready", { ok: true });
  });

  socket.on("message:send", async ({ patientId, sender, content, manual }) => {
    if (!patientId || !sender || !content) return;
    const message = await prisma.message.create({
      data: {
        patientId,
        sender,
        content,
        manual: Boolean(manual),
      },
    });
    io.to(`patient:${patientId}`).emit("message:new", { message });
  });
});

const PORT = process.env.SOCKET_PORT ? Number(process.env.SOCKET_PORT) : 3002;
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Socket.IO server listening on :${PORT}`);
});
