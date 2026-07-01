"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Image as ImageIcon } from "lucide-react";
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
      className="flex h-[50px] items-center justify-between gap-2.5 bg-white px-2.5"
    >
      <input
        type="text"
        placeholder="Type something..."
        value={message}
        onChange={handleTyping}
        className="w-full border-none text-lg text-[#2f2d52] outline-none placeholder:text-gray-300"
      />
      <div className="flex items-center gap-2.5">
        <Paperclip className="size-6 cursor-pointer text-gray-500" />
        <input type="file" id="img" className="hidden" />
        <label htmlFor="img">
          <ImageIcon className="size-6 cursor-pointer text-gray-500" />
        </label>
        <Button
          type="submit"
          disabled={sendMessage.isPending}
          className="bg-[#8da4f1] text-white hover:bg-[#8da4f1]/90"
        >
          Send
        </Button>
      </div>
    </form>
  );
};

export default Input;
