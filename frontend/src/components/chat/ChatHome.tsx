"use client";

import { useSession } from "next-auth/react";
import Sidebar from "@/components/sidebar/Sidebar";
import Chat from "./Chat";
import Welcome from "./Welcome";
import AppShellSkeleton from "./AppShellSkeleton";
import CallOverlay from "@/components/call/CallOverlay";
import { useChatSocket } from "./useChatSocket";
import { useWebRTCCall } from "./useWebRTCCall";
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
  const { status } = useSession();
  const { data: user, isLoading: userLoading } = useUser();
  const { selectedChatId } = useSelectedChat();

  const { socket, emitNewMessage, emitTyping, emitNotTyping } = useChatSocket({
    userId: user?.id,
    selectedChatId,
  });

  // 1-on-1 calling shares the same socket. Mounted here (not in Chat) so an
  // incoming call rings regardless of which chat — if any — is open.
  const call = useWebRTCCall({
    socket,
    selfUser: user
      ? { id: user.id, name: user.name, photo: user.photo }
      : null,
  });

  const hasChat = Boolean(selectedChatId);

  // Show the full app-shell skeleton until the session is resolved and the user
  // record has loaded, so the first paint is the app's shape rather than a
  // blank screen or a header with a missing name/avatar. All hooks above run
  // unconditionally, so this early return is safe.
  if (status === "loading" || (status === "authenticated" && (userLoading || !user))) {
    return <AppShellSkeleton />;
  }

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
            onStartCall={call.startCall}
          />
        ) : (
          <Welcome />
        )}
      </div>

      <CallOverlay call={call} />
    </div>
  );
};

export default ChatHome;
