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

/**
 * An image attachment on a message. `url` is a short-lived pre-signed S3 GET
 * URL minted by the backend on each read — do not cache it long-term; if it
 * 403s, refetch the messages to get a fresh one. The private S3 `key` is never
 * exposed to the client.
 */
export interface Attachment {
  id: string;
  url: string;
  mimeType: string;
  fileName: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
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
  /** Image attachments; present (possibly empty) on sendMessage/getMessages. */
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Metadata returned by POST /api/upload after an image is stored in S3, sent
 * back to the server as part of the next sendMessage call (upload-then-send).
 */
export interface UploadedAttachment {
  key: string;
  mimeType: string;
  fileName: string;
  size: number;
  width: number | null;
  height: number | null;
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
  /** Images uploaded via /api/upload; at least one required if content empty. */
  attachments?: UploadedAttachment[];
}

export interface UploadResponse {
  attachment: UploadedAttachment;
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
