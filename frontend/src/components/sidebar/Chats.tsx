"use client";

import ChatInfo from "./ChatInfo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { messageApi, type Chat } from "@/api";
import { useChats, useResetNotification, useSelectedChat } from "@/queries";

// A single loading placeholder row, matching ChatInfo's layout (avatar +
// title/preview lines) so the list keeps its shape while chats load.
const ChatRowSkeleton = () => (
  <div className="flex w-full items-center gap-3 px-3 py-2.5">
    <Skeleton className="size-11 shrink-0 rounded-full bg-white/10" />
    <div className="min-w-0 flex-1 space-y-2">
      <Skeleton className="h-3.5 w-2/5 rounded bg-white/10" />
      <Skeleton className="h-3 w-3/5 rounded bg-white/10" />
    </div>
  </div>
);

// Ported from _legacy/src/components/Sidebar/Chats.tsx. The chat list is now a
// React Query (useChats) instead of chatsSlice; selecting a chat preserves the
// old handleChatClick behavior exactly:
//   1. mark the *previously* open chat seen + clear its badge
//   2. clear the newly-opened chat's badge
//   3. select the new chat (its details/messages load via the per-chat queries)
const Chats = () => {
  const { data: chats = [], isLoading } = useChats();
  const { selectedChatId, selectChat } = useSelectedChat();
  const resetNotification = useResetNotification();

  const handleSelect = async (chat: Chat) => {
    if (selectedChatId) {
      try {
        await messageApi.markSeen(selectedChatId);
      } catch (error) {
        console.log(error);
      }
      resetNotification(selectedChatId);
    }
    resetNotification(chat.id);
    selectChat(chat.id);
  };

  return (
    <ScrollArea className="flex-1">
      {isLoading ? (
        // Skeleton rows while the chat list loads — avoids flashing the empty
        // state before the query resolves.
        Array.from({ length: 6 }).map((_, i) => <ChatRowSkeleton key={i} />)
      ) : chats.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-white/40">
          No conversations yet. Search for a user to start chatting.
        </p>
      ) : (
        chats.map((chat) => (
          <ChatInfo key={chat.id} chat={chat} onSelect={handleSelect} />
        ))
      )}
    </ScrollArea>
  );
};

export default Chats;
