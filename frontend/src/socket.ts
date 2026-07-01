import type { Socket } from "socket.io-client";
import type { Message } from "./api";

// Socket.IO event contracts shared by the chat UI. Mirrors the handlers in
// backend/server.js.

// Events the server emits to this client.
export interface ServerToClientEvents {
  connected: () => void;
  notify: (message: Message) => void;
  typing: () => void;
  notTyping: () => void;
}

// Events this client emits to the server.
export interface ClientToServerEvents {
  setup: (userId: string) => void;
  joinChat: (chatId: string) => void;
  newMessage: (message: Message) => void;
  typing: (chatId: string) => void;
  notTyping: (chatId: string) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
