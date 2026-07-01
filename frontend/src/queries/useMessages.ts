"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { messageApi, type Message, type SendMessageBody } from "@/api";
import { queryKeys } from "./keys";

/**
 * Replaces currentChat.messages populated by the fetchChat thunk. Messages in a
 * chat, oldest first. (Backend side effect: this also marks the chat read.)
 */
export function useMessages(
  chatId: string | null,
): UseQueryResult<Message[]> {
  return useQuery<Message[]>({
    queryKey: queryKeys.messages(chatId ?? "none"),
    queryFn: () => messageApi.list(chatId as string),
    enabled: chatId !== null,
  });
}

/**
 * Append a message to a chat's cached message list, with the exact dedupe rule
 * from the old chatSlice `appendMessage` reducer: skip if it matches the last
 * message's id (avoids the echo when the sender's own socket event arrives
 * after the optimistic/refetched insert).
 *
 * Standalone (takes a QueryClient) so both the socket "notify" handler and the
 * send mutation can reuse it.
 */
export function appendMessageToCache(
  queryClient: QueryClient,
  chatId: string,
  message: Message,
): void {
  queryClient.setQueryData<Message[]>(
    queryKeys.messages(chatId),
    (prev) => {
      const list = prev ?? [];
      const last = list[list.length - 1];
      if (last?.id === message.id) return list;
      return [...list, message];
    },
  );
}

/** Hook form of appendMessageToCache, bound to the active QueryClient. */
export function useAppendMessage() {
  const queryClient = useQueryClient();
  return useCallback(
    (chatId: string, message: Message) =>
      appendMessageToCache(queryClient, chatId, message),
    [queryClient],
  );
}

/**
 * Replaces messageApi.send + the follow-up dispatch(fetchChat)/dispatch(fetchChats)
 * the old Input component ran. On success it appends the created message to the
 * open chat and refreshes the sidebar list (latest-message preview / ordering).
 * The caller still emits the socket "newMessage" event with the returned message.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation<Message, Error, SendMessageBody>({
    mutationFn: (body) => messageApi.send(body),
    onSuccess: (message, variables) => {
      appendMessageToCache(queryClient, variables.chatId, message);
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}
