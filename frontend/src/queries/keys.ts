// Central React Query key factory. Using one place for keys keeps
// invalidation/setQueryData calls consistent across hooks and the socket
// bridge (so e.g. the "notify" handler and useSendMessage touch the same
// cache entries the queries read from).
export const queryKeys = {
  // Current Clerk-synced user record (was userSlice).
  user: ["user"] as const,

  // List of the current user's chats, with unread counts (was chatsSlice).
  chats: ["chats"] as const,

  // One chat's full details (was currentChat.chatDetails via fetchChatDetails).
  chat: (chatId: string) => ["chat", chatId] as const,

  // Messages in one chat (was currentChat.messages via fetchChat).
  messages: (chatId: string) => ["messages", chatId] as const,

  // User search results (Sidebar/Search), keyed by query string.
  userSearch: (query: string) => ["userSearch", query] as const,
};
