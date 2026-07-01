"use client";

import { useEffect, useMemo, useRef } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import type { AppSocket } from "@/socket";
import type { Chat, Message } from "@/api";
import { appendMessageToCache, queryKeys } from "@/queries";

// Socket.IO origin. Default to same-origin (window.location.host), which routes
// through the next.config.ts rewrite to the backend. If WebSocket upgrades
// don't survive the rewrite in your environment, set NEXT_PUBLIC_SOCKET_URL to
// the backend origin (e.g. http://localhost:5001) to connect directly — the
// mitigation flagged in the migration plan.
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

interface UseChatSocketArgs {
  userId: string | undefined;
  selectedChatId: string | null;
}

interface UseChatSocketResult {
  socket: AppSocket | null;
  emitNewMessage: (message: Message) => void;
  emitTyping: (chatId: string) => void;
  emitNotTyping: (chatId: string) => void;
}

// Consolidates the socket logic that the old SPA scattered across Home.tsx
// (connect + setup + "notify") and Input.tsx (typing emits). Incoming messages
// are written straight into the React Query cache instead of dispatched to
// Redux, so the chat view and sidebar update with no refetch on the hot path.
export function useChatSocket({
  userId,
  selectedChatId,
}: UseChatSocketArgs): UseChatSocketResult {
  const queryClient = useQueryClient();
  const socketRef = useRef<AppSocket | null>(null);

  // Keep the latest selected chat id readable inside the long-lived "notify"
  // listener without re-subscribing on every selection change.
  const selectedChatIdRef = useRef<string | null>(selectedChatId);
  selectedChatIdRef.current = selectedChatId;

  // Connect once we know who we are; re-run only if the user changes.
  useEffect(() => {
    if (!userId) return;

    const socket: AppSocket = SOCKET_URL ? io(SOCKET_URL) : io();
    socketRef.current = socket;

    socket.emit("setup", userId);

    socket.on("notify", (incoming: Message) => {
      const openChatId = selectedChatIdRef.current;
      const incomingChatId = incoming.chat?.id;

      if (openChatId && incomingChatId === openChatId) {
        // Message for the chat we're viewing: append + clear its badge.
        appendMessageToCache(queryClient, openChatId, incoming);
        queryClient.setQueryData<Chat[]>(queryKeys.chats, (prev) =>
          prev?.map((c) =>
            c.id === incomingChatId ? { ...c, notification: 0 } : c,
          ),
        );
      } else {
        // For another chat (or none open): refresh the list so its unread
        // badge/preview updates. Mirrors the old dispatch(fetchChats()).
        queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      }
    });

    return () => {
      socket.off("notify");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, queryClient]);

  // Join the room for the selected chat whenever it changes (was Chat.tsx).
  useEffect(() => {
    const socket = socketRef.current;
    if (socket?.connected && selectedChatId) {
      socket.emit("joinChat", selectedChatId);
    }
  }, [selectedChatId]);

  return useMemo(
    () => ({
      socket: socketRef.current,
      emitNewMessage: (message) =>
        socketRef.current?.emit("newMessage", message),
      emitTyping: (chatId) => socketRef.current?.emit("typing", chatId),
      emitNotTyping: (chatId) => socketRef.current?.emit("notTyping", chatId),
    }),
    // socketRef.current is a ref; consumers call these after connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [socketRef.current],
  );
}
