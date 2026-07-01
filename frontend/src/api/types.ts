// API data model — mirrors the raw Prisma records the backend now returns
// (backend/prisma/schema.prisma). Primary keys are `id` (UUID strings); there
// is no longer an `_id` Mongo-shaped alias. Date columns arrive as ISO strings
// over JSON, so they are typed `string` here.

export interface User {
  id: string;
  clerkId: string;
  name: string;
  email: string | null;
  photo: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  content: string | null;
  senderId: string | null;
  /** Hydrated when the endpoint includes it (sendMessage, getMessages). */
  sender?: User | null;
  chatId: string;
  /** Hydrated on sendMessage so clients can route the socket event by chat. */
  chat?: Chat | null;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  id: string;
  chatName: string | null;
  isGroupChat: boolean;
  /** Flattened from the ChatUser join table by the backend → plain User[]. */
  users: User[];
  groupAdminId: string | null;
  groupAdmin?: User | null;
  latestMessageId: string | null;
  latestMessage?: Message | null;
  createdAt: string;
  updatedAt: string;
  /** Unread count, present only on the chat-list endpoint (getAllChats). */
  notification?: number;
}

// ---- Request payloads ----

export interface CreateChatBody {
  userId: string;
}

export interface CreateGroupChatBody {
  name: string;
  users: string[];
}

export interface RenameGroupBody {
  groupId: string;
  groupName: string;
}

export interface GroupMemberBody {
  groupId: string;
  userId: string;
}

export interface SendMessageBody {
  content: string;
  chatId: string;
}

// ---- Response envelopes (backend wraps some payloads) ----

export interface AuthResponse {
  auth: boolean;
  user: User;
}

export interface MessagesResponse {
  messages: Message[];
}

export interface SendMessageResponse {
  message: Message;
}
