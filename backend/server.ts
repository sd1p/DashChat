import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import userRoutes from "./routes/userRoutes";
import chatRoutes from "./routes/chatRoutes";
import messageRoutes from "./routes/messageRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import prisma from "./config/prisma";
import errorHandler from "./middleware/errorHandler";

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

// Auth is per-route via isAuthenticated, which verifies the Argus-issued JWT
// (Bearer token) against Argus's JWKS. No global auth middleware is needed.

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/upload", uploadRoutes);

app.use(errorHandler);

// This service is API-only. Realtime is served by Hermes (a shared, external
// Socket.IO service) — this backend no longer runs a socket server. It fans
// out realtime events by publishing to Hermes's Redis-backed bus (see
// lib/hermes.ts), which lets the backend scale to multiple instances freely.
// The frontend is a standalone Next.js app that reaches this backend over REST
// and connects to Hermes directly for realtime.
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "api working" });
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server Started on port ${PORT}`));
