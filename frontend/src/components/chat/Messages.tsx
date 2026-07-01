"use client";

import { useEffect, useRef } from "react";
import Message from "./Message";
import { useMessages, useSelectedChat } from "@/queries";

// Ported from _legacy/src/components/Chat/Messages.tsx. Reads the open chat's
// messages from React Query (was currentChat.messages) and auto-scrolls to the
// newest on every change — same behavior as before.
const Messages = () => {
  const { selectedChatId } = useSelectedChat();
  const { data: messages = [] } = useMessages(selectedChatId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  return (
    <div className="mb-2.5 h-[calc(100%-160px)] overflow-auto bg-[#ddddf7] p-2.5">
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </div>
  );
};

export default Messages;
