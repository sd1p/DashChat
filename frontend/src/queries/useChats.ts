"use client";

import { useSession } from "next-auth/react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useCallback } from "react";
import {
  chatApi,
  type Chat,
  type CreateGroupChatBody,
  type GroupMemberBody,
  type RenameGroupBody,
} from "@/api";
import { queryKeys } from "./keys";

// ---- Queries ----

/**
 * Replaces chatsSlice + fetchChats: the current user's chats with unread counts.
 *
 * Gated on the Auth.js session status (like useUser). Without this the query
 * fires on mount before the session has hydrated, the request goes out with no
 * Bearer token, the backend returns 401, and the empty result gets cached — so
 * the sidebar shows no chats. Waiting for the session avoids that race.
 */
export function useChats(): UseQueryResult<Chat[]> {
  const { status } = useSession();

  return useQuery<Chat[]>({
    queryKey: queryKeys.chats,
    queryFn: () => chatApi.list(),
    enabled: status === "authenticated",
  });
}

/**
 * Replaces the chatsSlice `resetNotification` reducer. Zeroes one chat's unread
 * badge directly in the cached chat list (no refetch) — same optimistic, local
 * effect the reducer had. Returned as a stable callback so socket/effect code
 * can call it imperatively.
 */
export function useResetNotification() {
  const queryClient = useQueryClient();

  return useCallback(
    (chatId: string) => {
      queryClient.setQueryData<Chat[]>(queryKeys.chats, (prev) =>
        prev?.map((chat) =>
          chat.id === chatId ? { ...chat, notification: 0 } : chat,
        ),
      );
    },
    [queryClient],
  );
}

// ---- Mutations (the chatApi write endpoints) ----
// Each invalidates ['chats'] so the sidebar list reflects the change. Group
// mutations also refresh the affected chat's details.

export function useCreateDirectChat() {
  const queryClient = useQueryClient();
  return useMutation<Chat, Error, string>({
    mutationFn: (userId) => chatApi.createDirect(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

export function useCreateGroupChat() {
  const queryClient = useQueryClient();
  return useMutation<Chat, Error, CreateGroupChatBody>({
    mutationFn: (body) => chatApi.createGroup(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

export function useRenameGroup() {
  const queryClient = useQueryClient();
  return useMutation<Chat, Error, RenameGroupBody>({
    mutationFn: (body) => chatApi.renameGroup(body),
    onSuccess: (chat) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      queryClient.setQueryData(queryKeys.chat(chat.id), chat);
    },
  });
}

export function useAddGroupMember() {
  const queryClient = useQueryClient();
  return useMutation<Chat, Error, GroupMemberBody>({
    mutationFn: (body) => chatApi.addMember(body),
    onSuccess: (chat) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      queryClient.setQueryData(queryKeys.chat(chat.id), chat);
    },
  });
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient();
  return useMutation<Chat, Error, GroupMemberBody>({
    mutationFn: (body) => chatApi.removeMember(body),
    onSuccess: (chat) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      queryClient.setQueryData(queryKeys.chat(chat.id), chat);
    },
  });
}
