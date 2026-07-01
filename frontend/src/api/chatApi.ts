import { apiClient } from "./client";
import type {
  Chat,
  CreateChatBody,
  CreateGroupChatBody,
  GroupMemberBody,
  RenameGroupBody,
} from "./types";

// Chat endpoints (backend/routes/chatRoutes.js).
export const chatApi = {
  /** GET /api/chat — all chats for the current user, with unread counts. */
  async list(): Promise<Chat[]> {
    const { data } = await apiClient.get<Chat[]>("/api/chat");
    return data;
  },

  /** GET /api/chat/:chatId — full details for one chat. */
  async get(chatId: string): Promise<Chat> {
    const { data } = await apiClient.get<Chat>(`/api/chat/${chatId}`);
    return data;
  },

  /** POST /api/chat — find-or-create a 1-on-1 chat with another user. */
  async createDirect(userId: string): Promise<Chat> {
    const body: CreateChatBody = { userId };
    const { data } = await apiClient.post<Chat>("/api/chat", body);
    return data;
  },

  /** POST /api/chat/group — create a group chat. */
  async createGroup(body: CreateGroupChatBody): Promise<Chat> {
    const { data } = await apiClient.post<Chat>("/api/chat/group", body);
    return data;
  },

  /** PUT /api/chat/rename — rename a group (admin only). */
  async renameGroup(body: RenameGroupBody): Promise<Chat> {
    const { data } = await apiClient.put<Chat>("/api/chat/rename", body);
    return data;
  },

  /** PUT /api/chat/groupadd — add a member to a group (admin only). */
  async addMember(body: GroupMemberBody): Promise<Chat> {
    const { data } = await apiClient.put<Chat>("/api/chat/groupadd", body);
    return data;
  },

  /** PUT /api/chat/groupremove — remove a member from a group (admin only). */
  async removeMember(body: GroupMemberBody): Promise<Chat> {
    const { data } = await apiClient.put<Chat>("/api/chat/groupremove", body);
    return data;
  },
};
