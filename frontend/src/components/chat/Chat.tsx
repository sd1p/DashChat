"use client";

import { useEffect, useState } from "react";
import { Video, UserPlus, MoreVertical } from "lucide-react";
import Messages from "./Messages";
import Input from "./Input";
import { useChatDetails, useSelectedChat, useUser } from "@/queries";
import type { AppSocket } from "@/socket";
import type { Message } from "@/api";

interface ChatProps {
  socket: AppSocket | null;
  emitNewMessage: (message: Message) => void;
  emitTyping: (chatId: string) => void;
  emitNotTyping: (chatId: string) => void;
}

// Ported from _legacy/src/components/Chat/Chat.tsx. Chat details come from
// useChatDetails(selectedChatId) (was currentChat.chatDetails). Room-join now
// lives in useChatSocket; here we just own the typing indicator + header.
const Chat = ({ socket, emitNewMessage, emitTyping, emitNotTyping }: ChatProps) => {
  const { selectedChatId } = useSelectedChat();
  const { data: user } = useUser();
  const { data: chatDetails } = useChatDetails(selectedChatId);
  const [isTyping, setIsTyping] = useState(false);

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

  if (!selectedChatId || !chatDetails) return null;

  const { isGroupChat, users, chatName } = chatDetails;
  const peer = users.find((u) => u.id !== user?.id) ?? users[0];
  const title = !chatName ? "" : !isGroupChat ? peer?.name ?? "" : chatName;

  return (
    <div className="flex flex-[2.5] flex-col">
      <div className="flex h-[50px] items-center bg-[#5d5b8d] px-2.5 text-gray-200">
        <span>{title}</span>
        <span className="m-auto text-sm italic">{isTyping && "typing..."}</span>
        <div className="ml-auto flex gap-2.5">
          <Video className="size-[22px] cursor-pointer" />
          <UserPlus className="size-[22px] cursor-pointer" />
          <MoreVertical className="size-[22px] cursor-pointer" />
        </div>
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
    </div>
  );
};

export default Chat;
