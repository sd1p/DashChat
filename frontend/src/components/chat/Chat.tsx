"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, UserPlus, Phone, Video } from "lucide-react";
import Messages from "./Messages";
import Input from "./Input";
import AddMemberDialog from "./AddMemberDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useChatDetails, useSelectedChat, useUser } from "@/queries";
import type { AppSocket } from "@/socket";
import type { Message } from "@/api";

interface ChatProps {
  socket: AppSocket | null;
  emitNewMessage: (message: Message) => void;
  emitTyping: (chatId: string) => void;
  emitNotTyping: (chatId: string) => void;
  onStartCall: (
    peer: { id: string; name: string; photo: string },
    chatId: string,
    withVideo: boolean,
  ) => void;
}

// Ported from _legacy/src/components/Chat/Chat.tsx. Chat details come from
// useChatDetails(selectedChatId). Room-join lives in useChatSocket; here we own
// the typing indicator + header.
//
// Redesigned as a shadcn-style conversation pane: a header with a mobile back
// button (clears the selection to return to the sidebar list), the peer avatar,
// title + presence line, and ghost icon actions.
const Chat = ({
  socket,
  emitNewMessage,
  emitTyping,
  emitNotTyping,
  onStartCall,
}: ChatProps) => {
  const { selectedChatId, selectChat } = useSelectedChat();
  const { data: user } = useUser();
  const { data: chatDetails } = useChatDetails(selectedChatId);
  const [isTyping, setIsTyping] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Peer's typing indicator (the server broadcasts typing/notTyping to the room).
  useEffect(() => {
    if (!socket) return;
    const onTyping = () => setIsTyping(true);
    const onNotTyping = () => setIsTyping(false);
    socket.on("typing", onTyping);
    socket.on("notTyping", onNotTyping);
    return () => {
      socket.off("typing", onTyping);
      socket.off("notTyping", onNotTyping);
    };
  }, [socket]);

  // Only bail when there is genuinely no selection. While the details are still
  // loading we DON'T return null — that would drop to the parent's plain white
  // background and flash a white "splash" before the chat mounts. Instead the
  // themed pane renders immediately with a header skeleton.
  if (!selectedChatId) return null;

  const isGroupChat = chatDetails?.isGroupChat ?? false;
  const users = chatDetails?.users ?? [];
  const chatName = chatDetails?.chatName;
  const peer = users.find((u) => u.id !== user?.id) ?? users[0];
  const title = !chatName ? peer?.name ?? "" : !isGroupChat ? peer?.name ?? "" : chatName;
  const avatar = isGroupChat ? users[0]?.photo : peer?.photo;
  const isLoading = !chatDetails;
  // Only the group admin (the creator) can add participants.
  const isAdmin = isGroupChat && chatDetails?.groupAdminId === user?.id;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-chat-surface">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-black/10 bg-brand-dark px-3 text-chat-header-fg">
        {/* Back to the conversation list — mobile only. */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => selectChat(null)}
          className="size-9 shrink-0 text-chat-header-fg hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Back to chats"
        >
          <ArrowLeft className="size-5" />
        </Button>

        {isLoading ? (
          <>
            <div className="size-9 shrink-0 animate-pulse rounded-full bg-white/10" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-32 max-w-[50%] animate-pulse rounded bg-white/10" />
            </div>
          </>
        ) : (
          <>
            <Avatar className="size-9 shrink-0">
              <AvatarImage src={avatar} alt={title} />
              <AvatarFallback className="bg-brand-sidebar text-sm text-white">
                {title?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{title}</p>
              <p className="h-4 truncate text-xs text-brand-accent">
                {isTyping ? "typing…" : ""}
              </p>
            </div>
          </>
        )}

        {/* 1-on-1 call actions — voice + video. Group calling is out of scope. */}
        {!isLoading && !isGroupChat && peer && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                onStartCall(
                  { id: peer.id, name: peer.name, photo: peer.photo },
                  selectedChatId,
                  false,
                )
              }
              className="size-9 text-chat-header-fg hover:bg-white/10 hover:text-white"
              aria-label="Start voice call"
            >
              <Phone className="size-[18px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                onStartCall(
                  { id: peer.id, name: peer.name, photo: peer.photo },
                  selectedChatId,
                  true,
                )
              }
              className="size-9 text-chat-header-fg hover:bg-white/10 hover:text-white"
              aria-label="Start video call"
            >
              <Video className="size-[18px]" />
            </Button>
          </div>
        )}

        {/* Group-only action — only the admin can add people. */}
        {!isLoading && isGroupChat && isAdmin && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAddMember(true)}
              className="size-9 text-chat-header-fg hover:bg-white/10 hover:text-white"
              aria-label="Add people"
            >
              <UserPlus className="size-[18px]" />
            </Button>
          </div>
        )}
      </div>

      <Messages />

      <Input
        key={selectedChatId}
        chatId={selectedChatId}
        socket={socket}
        emitNewMessage={emitNewMessage}
        emitTyping={emitTyping}
        emitNotTyping={emitNotTyping}
      />

      {showAddMember && chatDetails && (
        <AddMemberDialog
          chat={chatDetails}
          onClose={() => setShowAddMember(false)}
        />
      )}
    </div>
  );
};

export default Chat;
