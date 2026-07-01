// Frontend API repository — the single place that lists every backend endpoint
// and the interfaces they exchange. Import resource clients and types from here:
//
//   import { chatApi, type Chat } from "../api";
//
// Each resource client (userApi/chatApi/messageApi) wraps backend/routes/*.js
// and returns typed domain objects from ./types.

export { apiClient } from "./client";
export { userApi } from "./userApi";
export { chatApi } from "./chatApi";
export { messageApi } from "./messageApi";
export {
  uploadApi,
  validateImageFile,
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
} from "./uploadApi";

export type {
  User,
  Message,
  Attachment,
  UploadedAttachment,
  Chat,
  CreateChatBody,
  CreateGroupChatBody,
  RenameGroupBody,
  GroupMemberBody,
  SendMessageBody,
  AuthResponse,
  MessagesResponse,
  SendMessageResponse,
  UploadResponse,
} from "./types";
