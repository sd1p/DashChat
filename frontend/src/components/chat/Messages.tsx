"use client";

import { useEffect, useRef } from "react";
import Message from "./Message";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatDetails, useMessages, useSelectedChat } from "@/queries";

// Loading placeholder for the message list — a handful of chat-bubble
// silhouettes alternating between incoming (left) and outgoing (right) so the
// pane keeps its shape while a chat's messages are fetched, instead of flashing
// an empty surface before they arrive.
const MessagesSkeleton = () => {
  // Widths/sides chosen to look like a real, varied conversation.
  const rows = [
    { mine: false, width: "w-40" },
    { mine: false, width: "w-56" },
    { mine: true, width: "w-48" },
    { mine: false, width: "w-32" },
    { mine: true, width: "w-60" },
    { mine: true, width: "w-36" },
  ];
  return (
    <div className="flex flex-1 flex-col justify-end gap-3 overflow-hidden bg-chat-surface px-3 py-4 md:px-16">
      {rows.map((row, i) => (
        <div
          key={i}
          className={`flex ${row.mine ? "justify-end" : "justify-start"}`}
        >
          <Skeleton
            className={`h-10 ${row.width} max-w-[70%] rounded-2xl bg-white/10`}
          />
        </div>
      ))}
    </div>
  );
};

// Ported from _legacy/src/components/Chat/Messages.tsx. Reads the open chat's
// messages from React Query (was currentChat.messages) and auto-scrolls to the
// newest on every change — same behavior as before.
//
// WhatsApp-style layout on the app's brand tint: each message is told whether
// it's a group chat (so peer sender names show) and whether it starts a new run
// from the same sender (so only the first bubble of a run gets the little tail).
const Messages = () => {
  const { selectedChatId } = useSelectedChat();
  const { data: messages = [], isLoading } = useMessages(selectedChatId);
  const { data: chatDetails } = useChatDetails(selectedChatId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  const isGroupChat = chatDetails?.isGroupChat ?? false;

  // Show bubble skeletons while the chat's messages are still being fetched.
  if (isLoading) return <MessagesSkeleton />;

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
