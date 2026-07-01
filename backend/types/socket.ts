import type { Chat, Message, User } from "@prisma/client";

// Socket.IO event contracts — the server side of the same shapes the frontend
// declares in frontend/src/socket.ts.

// A message as broadcast over the socket: the Prisma Message plus the hydrated
// sender and chat (with members) the notify handler needs to route it.
export interface SocketMessage extends Message {
  sender?: User | null;
  chat?: (Chat & { users?: User[] }) | null;
}

// Events the client emits to the server.
export interface ClientToServerEvents {
  setup: (userId: string) => void;
  joinChat: (chatId: string) => void;
  newMessage: (message: SocketMessage) => void;
  typing: (room: string) => void;
  notTyping: (room: string) => void;
}

// Events the server emits to clients.
export interface ServerToClientEvents {
  connected: () => void;
  notify: (message: SocketMessage) => void;
  typing: () => void;
  notTyping: () => void;
}
