"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Image as ImageIcon, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/queries";
import type { AppSocket } from "@/socket";

interface InputProps {
  chatId: string;
  socket: AppSocket | null;
  emitNewMessage: (message: import("@/api").Message) => void;
  emitTyping: (chatId: string) => void;
  emitNotTyping: (chatId: string) => void;
}

// Ported from _legacy/src/components/Chat/Input.tsx. Sending now goes through
// the useSendMessage mutation (which appends to the open chat + invalidates the
// sidebar list); the socket "newMessage" emit and the typing/notTyping debounce
// are preserved.
const Input = ({
  chatId,
  socket,
  emitNewMessage,
  emitTyping,
  emitNotTyping,
}: InputProps) => {
  const [message, setMessage] = useState("");
  const typingRef = useRef(false);
  const sendMessage = useSendMessage();

  // Reset the draft when switching chats (the component is keyed by chatId, but
  // keep this for safety / clarity — matches the old effect).
  useEffect(() => {
    setMessage("");
  }, [chatId]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (!socket?.connected) return;

    if (!typingRef.current) {
      typingRef.current = true;
      emitTyping(chatId);
    }

    const startedAt = Date.now();
    const duration = 3000;
    setTimeout(() => {
      if (Date.now() - startedAt >= duration && typingRef.current) {
        emitNotTyping(chatId);
        typingRef.current = false;
      }
    }, duration);
  };

  const handleSend = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const content = message.trim();
    if (!content) return;
    try {
      const sent = await sendMessage.mutateAsync({ chatId, content });
      setMessage("");
      if (socket?.connected) emitNewMessage(sent);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <form
      onSubmit={handleSend}
      className="flex shrink-0 items-center gap-2 border-t border-black/10 bg-white p-3"
    >
      <div className="flex items-center gap-1 text-gray-400">
        <input type="file" id="img" className="hidden" />
        <label
          htmlFor="img"
          className="flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Attach image"
        >
          <ImageIcon className="size-[18px]" />
        </label>
        <span
          className="flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Attach file"
        >
          <Paperclip className="size-[18px]" />
        </span>
      </div>

      <input
        type="text"
        placeholder="Type a message…"
        value={message}
        onChange={handleTyping}
        className="h-10 min-w-0 flex-1 rounded-full bg-gray-100 px-4 text-sm text-[#2f2d52] outline-none transition-colors placeholder:text-gray-400 focus:bg-gray-50 focus:ring-2 focus:ring-brand-accent/50"
      />

      <Button
        type="submit"
        size="icon"
        disabled={sendMessage.isPending || !message.trim()}
        className="size-10 shrink-0 rounded-full bg-[#8da4f1] text-white hover:bg-[#8da4f1]/90"
        aria-label="Send message"
      >
        <SendHorizontal className="size-[18px]" />
      </Button>
    </form>
  );
};

export default Input;
