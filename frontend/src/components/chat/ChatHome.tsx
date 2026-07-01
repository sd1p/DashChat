"use client";

import Sidebar from "@/components/sidebar/Sidebar";
import Chat from "./Chat";
import Welcome from "./Welcome";
import { useChatSocket } from "./useChatSocket";
import { useSelectedChat, useUser } from "@/queries";

// Ported from _legacy/src/pages/Home/Home.tsx. Owns the single socket
// connection (useChatSocket) and lays out Sidebar | (Chat or Welcome). The
// "notify" handling that used to live here is inside useChatSocket now; this
// component just threads the emit helpers down to the active Chat.
const ChatHome = () => {
  const { data: user } = useUser();
  const { selectedChatId } = useSelectedChat();

  const { socket, emitNewMessage, emitTyping, emitNotTyping } = useChatSocket({
    userId: user?.id,
    selectedChatId,
  });

  return (
    <div className="flex h-screen w-screen">
      <Sidebar />
      {selectedChatId ? (
        <Chat
          socket={socket}
          emitNewMessage={emitNewMessage}
          emitTyping={emitTyping}
          emitNotTyping={emitNotTyping}
        />
      ) : (
        <Welcome />
      )}
    </div>
  );
};

export default ChatHome;
