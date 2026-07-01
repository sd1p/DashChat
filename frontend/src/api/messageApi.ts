import { apiClient } from "./client";
import type {
  Message,
  MessagesResponse,
  SendMessageBody,
  SendMessageResponse,
} from "./types";

// Message endpoints (backend/routes/messageRoutes.js).
export const messageApi = {
  /**
   * GET /api/message/:chatId — messages in a chat (oldest first). Side effect:
   * the backend also marks the chat read for the current user.
   */
  async list(chatId: string): Promise<Message[]> {
    const { data } = await apiClient.get<MessagesResponse>(
      `/api/message/${chatId}`
    );
    return data.messages;
  },

  /** POST /api/message — send a message; returns the created message. */
  async send(body: SendMessageBody): Promise<Message> {
    const { data } = await apiClient.post<SendMessageResponse>(
      "/api/message",
      body
    );
    return data.message;
  },

  /** GET /api/message/mark-seen/:chatId — mark a chat read for the user. */
  async markSeen(chatId: string): Promise<void> {
    await apiClient.get(`/api/message/mark-seen/${chatId}`);
  },
};
