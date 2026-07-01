"use client";

import ChatInfo from "./ChatInfo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { messageApi, type Chat } from "@/api";
import { useChats, useResetNotification, useSelectedChat } from "@/queries";

// Ported from _legacy/src/components/Sidebar/Chats.tsx. The chat list is now a
// React Query (useChats) instead of chatsSlice; selecting a chat preserves the
// old handleChatClick behavior exactly:
//   1. mark the *previously* open chat seen + clear its badge
//   2. clear the newly-opened chat's badge
//   3. select the new chat (its details/messages load via the per-chat queries)
const Chats = () => {
  const { data: chats = [] } = useChats();
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
      <div className="px-3 pb-1 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Messages
        </span>
      </div>
      {chats.length === 0 ? (
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
