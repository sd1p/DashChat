// React Query layer — the replacement for the old Redux store (features/*).
// Import hooks from here:
//
//   import { useChats, useSendMessage, useSelectedChat } from "@/queries";
//
// Each hook wraps a resource client from @/api and reads/writes the shared
// QueryClient cache keyed by queryKeys.
export { queryKeys } from "./keys";
export { useUser, useUpdateProfile } from "./useUser";
export {
  useChats,
  useResetNotification,
  useCreateDirectChat,
  useCreateGroupChat,
  useRenameGroup,
  useAddGroupMember,
  useRemoveGroupMember,
} from "./useChats";
export { useChatDetails, useUserSearch } from "./useChatDetails";
export {
  useMessages,
  useSendMessage,
  useAppendMessage,
  appendMessageToCache,
} from "./useMessages";
export {
  SelectedChatProvider,
  useSelectedChat,
} from "./SelectedChatContext";
