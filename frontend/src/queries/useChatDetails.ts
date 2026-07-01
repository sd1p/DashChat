"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { chatApi, userApi, type Chat, type User } from "@/api";
import { queryKeys } from "./keys";

/**
 * Replaces the currentChat.chatDetails state populated by the fetchChatDetails
 * thunk. Full details for the selected chat; disabled when no chat is selected.
 */
export function useChatDetails(
  chatId: string | null,
): UseQueryResult<Chat> {
  return useQuery<Chat>({
    queryKey: queryKeys.chat(chatId ?? "none"),
    queryFn: () => chatApi.get(chatId as string),
    enabled: chatId !== null,
  });
}

/**
 * User search for the Sidebar search box (userApi.search). Disabled for empty
 * queries so it doesn't fire on every keystroke before the user types.
 */
export function useUserSearch(query: string): UseQueryResult<User[]> {
  const trimmed = query.trim();
  return useQuery<User[]>({
    queryKey: queryKeys.userSearch(trimmed),
    queryFn: () => userApi.search(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 60_000,
  });
}
