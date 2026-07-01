"use client";

import timeConversion from "@/utils/timeConversion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUser } from "@/queries";
import type { Message as MessageType } from "@/api";

interface MessageProps {
  message: MessageType;
}

// Ported from _legacy/src/components/Chat/Message.tsx. Owner bubbles sit on the
// right (#8da4f1, white text); peer bubbles on the left (white). Same as the
// old .message / .message.owner SCSS.
const Message = ({ message }: MessageProps) => {
  const { data: user } = useUser();
  const time = timeConversion(message.createdAt);
  const isOwner = message.sender?.id === user?.id;

  return (
    <div className={cn("flex items-end gap-2", isOwner && "flex-row-reverse")}>
      <Avatar className="size-10">
        <AvatarImage src={message.sender?.photo} alt={message.sender?.name ?? ""} />
        <AvatarFallback className="text-[11px]">
          {message.sender?.name?.[0]?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "relative my-2.5 max-w-[65%] rounded-[0_10px_10px_10px] bg-white px-5 py-2.5 pr-14",
          isOwner && "rounded-[10px_0_10px_10px] bg-[#8da4f1]",
        )}
      >
        <p
          className={cn(
            "m-0 break-words text-[#2f2d52]",
            isOwner && "text-white",
          )}
        >
          {message.content}
        </p>
        <span
          className={cn(
            "absolute bottom-1 right-2 text-[10px] text-gray-500",
            isOwner && "text-white/80",
          )}
        >
          {time}
        </span>
      </div>
    </div>
  );
};

export default Message;
