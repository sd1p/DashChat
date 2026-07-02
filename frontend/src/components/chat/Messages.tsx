"use client";

import { useEffect, useRef } from "react";
import Message from "./Message";
import { useChatDetails, useMessages, useSelectedChat } from "@/queries";

// Ported from _legacy/src/components/Chat/Messages.tsx. Reads the open chat's
// messages from React Query (was currentChat.messages) and auto-scrolls to the
// newest on every change — same behavior as before.
//
// WhatsApp-style layout on the app's brand tint: each message is told whether
// it's a group chat (so peer sender names show) and whether it starts a new run
// from the same sender (so only the first bubble of a run gets the little tail).
const Messages = () => {
  const { selectedChatId } = useSelectedChat();
  const { data: messages = [] } = useMessages(selectedChatId);
  const { data: chatDetails } = useChatDetails(selectedChatId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  const isGroupChat = chatDetails?.isGroupChat ?? false;

  return (
    <div className="flex-1 overflow-y-auto bg-chat-surface px-3 py-4 md:px-16">
      {messages.map((message, i) => {
        // First bubble of a run from the same sender gets the tail.
        const startsRun = messages[i - 1]?.senderId !== message.senderId;
        return (
          <Message
            key={message.id}
            message={message}
            isGroupChat={isGroupChat}
            startsRun={startsRun}
          />
        );
      })}
      <div ref={endRef} />
    </div>
  );
};

export default Messages;
