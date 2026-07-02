import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { Server } from "socket.io";
import { clerkMiddleware } from "@clerk/express";
import userRoutes from "./routes/userRoutes";
import chatRoutes from "./routes/chatRoutes";
import messageRoutes from "./routes/messageRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import prisma from "./config/prisma";
import errorHandler from "./middleware/errorHandler";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./types/socket";

dotenv.config({ path: "backend/config/.env" });

const app = express();

//db setup — verify Postgres is reachable on boot
prisma
  .$connect()
  .then(() => console.log("PostgreSQL Connected via Prisma"))
  .catch((err: unknown) => {
    console.log(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });

//middlewares
app.enable("trust proxy");
const allowedOrigins = "*";
app.use(cors({ origin: allowedOrigins }));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Attaches the Clerk auth state to every request (req.auth / getAuth(req)).
app.use(clerkMiddleware());

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/upload", uploadRoutes);

app.use(errorHandler);

// This service is API-only. The frontend is a standalone Next.js app deployed
// as its own container/service; it reaches this backend over the network
// (REST via /api, Socket.IO via a direct connection). No static serving here.
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "api working" });
});

const PORT = process.env.PORT;
const server = app.listen(PORT, () =>
  console.log(`Server Started on port ${PORT}`)
);

//socket
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  pingTimeout: 60000,
  cors: { origin: allowedOrigins },
});

io.on("connection", (socket) => {
  console.log("connected to socket.io");

  //connecting to user
  socket.on("setup", (userId) => {
    if (userId) {
      socket.join(userId);
      socket.emit("connected");
      console.log("logged: " + userId);
    }
  });

  //joining chat room
  socket.on("joinChat", (chatRoomId) => {
    socket.join(chatRoomId);
    console.log("joined: " + chatRoomId);
  });

  //pooling for new messages
  socket.on("newMessage", (newMessageRecieved) => {
    const chat = newMessageRecieved.chat;
    if (!chat?.users) return;

    const senderId = newMessageRecieved.sender?.id;
    for (const user of chat.users) {
      if (user.id !== senderId) {
        console.log("sent to " + user.id);
        socket.in(user.id).emit("notify", newMessageRecieved);
      }
    }
  });

  //chatroom events
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("notTyping", (room) => socket.in(room).emit("notTyping"));

  // WebRTC call signaling — pure relay to the peer's user room (joined in
  // "setup"). The server never inspects SDP/ICE payloads; media itself flows
  // peer-to-peer and never touches this server.
  socket.on("callUser", ({ toUserId, chatId, offer, from, withVideo }) => {
    socket
      .to(toUserId)
      .emit("incomingCall", { fromUserId: from.id, chatId, offer, from, withVideo });
  });
  socket.on("answerCall", ({ toUserId, answer }) => {
    socket.to(toUserId).emit("callAnswered", { answer });
  });
  socket.on("iceCandidate", ({ toUserId, candidate }) => {
    socket.to(toUserId).emit("iceCandidate", { candidate });
  });
  socket.on("rejectCall", ({ toUserId }) => {
    socket.to(toUserId).emit("callRejected");
  });
  socket.on("endCall", ({ toUserId }) => {
    socket.to(toUserId).emit("callEnded");
  });
});
