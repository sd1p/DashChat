"use client";

import Sidebar from "@/components/sidebar/Sidebar";
import Chat from "./Chat";
import Welcome from "./Welcome";
import { useChatSocket } from "./useChatSocket";
import { useSelectedChat, useUser } from "@/queries";
import { cn } from "@/lib/utils";

// Ported from _legacy/src/pages/Home/Home.tsx. Owns the single socket
// connection (useChatSocket) and lays out Sidebar | (Chat or Welcome).
//
// Responsive shell (Slack / WhatsApp style):
//   - Desktop (md+): sidebar and chat pane sit side by side.
//   - Mobile: a single column. The sidebar fills the screen until a chat is
//     opened; opening one slides the chat pane over it, and the chat header's
//     back button clears the selection to return to the list.
const ChatHome = () => {
  const { data: user } = useUser();
  const { selectedChatId } = useSelectedChat();

  const { socket, emitNewMessage, emitTyping, emitNotTyping } = useChatSocket({
    userId: user?.id,
    selectedChatId,
  });

  const hasChat = Boolean(selectedChatId);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Sidebar: full width on mobile, fixed rail on desktop. Hidden on
          mobile while a chat is open so the conversation gets the screen. */}
      <div
        className={cn(
          "h-full w-full shrink-0 md:flex md:w-80 lg:w-96",
          hasChat ? "hidden md:flex" : "flex",
        )}
      >
        <Sidebar />
      </div>

      {/* Chat / Welcome pane: takes the remaining space on desktop; on mobile
          it only mounts once a chat is selected (so the sidebar is the home). */}
      <div
        className={cn(
          "h-full min-w-0 flex-1",
          hasChat ? "flex" : "hidden md:flex",
        )}
      >
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
    </div>
  );
};

export default ChatHome;
