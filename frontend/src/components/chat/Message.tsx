"use client";

import timeConversion from "@/utils/timeConversion";
import { cn } from "@/lib/utils";
import { useUser } from "@/queries";
import type { Message as MessageType } from "@/api";
import MessageAttachments from "./MessageAttachments";

interface MessageProps {
  message: MessageType;
  /** In group chats we label peer bubbles with the sender's name. */
  isGroupChat?: boolean;
  /** First message of a run from the same sender — gets the little tail. */
  startsRun?: boolean;
}

// A small palette of stable colors for group-sender name labels, keyed off the
// sender id so a given person keeps the same color.
const NAME_COLORS = [
  "#5d5b8d",
  "#8da4f1",
  "#7f66ff",
  "#c06fd6",
  "#5b8def",
  "#6f8fb3",
];
const nameColor = (id: string | null | undefined) => {
  if (!id) return NAME_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
};

// Ported from _legacy/src/components/Chat/Message.tsx. WhatsApp-style layout —
// no avatars in the thread, bubbles hug their side with a small tail on the
// first of a run, time inline at the bottom-right — but using the app's brand
// palette: own messages on the accent (#8da4f1), peers on white.
const Message = ({ message, isGroupChat, startsRun }: MessageProps) => {
  const { data: user } = useUser();
  const time = timeConversion(message.createdAt);
  const isOwner = message.sender?.id === user?.id;
  const showName = isGroupChat && !isOwner && startsRun;
  const attachments = message.attachments ?? [];
  const hasText = !!message.content;

  return (
    <div
      className={cn(
        "flex px-1",
        isOwner ? "justify-end" : "justify-start",
        startsRun ? "mt-2" : "mt-0.5",
      )}
    >
      <div
        className={cn(
          "relative max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm shadow-sm sm:max-w-[65%]",
          isOwner ? "bg-[#8da4f1] text-white" : "bg-white text-[#2f2d52]",
          // Square off the top corner on the tail side for the first of a run.
          startsRun && (isOwner ? "rounded-tr-none" : "rounded-tl-none"),
        )}
      >
        {/* CSS tail — a small triangle poking out of the top corner. */}
        {startsRun && (
          <span
            aria-hidden
            className={cn(
              "absolute top-0 h-0 w-0 border-[6px] border-transparent",
              isOwner
                ? "-right-[6px] border-l-[#8da4f1] border-t-[#8da4f1]"
                : "-left-[6px] border-r-white border-t-white",
            )}
          />
        )}

        {showName && (
          <span
            className="mb-0.5 block text-xs font-semibold"
            style={{ color: nameColor(message.sender?.id) }}
          >
            {message.sender?.name}
          </span>
        )}

        {/* Image attachments render above the text (if any). */}
        {attachments.length > 0 && (
          <MessageAttachments attachments={attachments} isOwner={isOwner} />
        )}

        {/* Text with the inline time floated to the end so it wraps naturally. */}
        {hasText && (
          <span className="break-words leading-relaxed">{message.content}</span>
        )}
        <span
          className={cn(
            "float-right ml-2 mt-1 translate-y-0.5 text-[10px]",
            // No text row to sit beside — nudge the timestamp under the image.
            !hasText && "clear-both block text-right",
            isOwner ? "text-white/70" : "text-gray-400",
          )}
        >
          {time}
        </span>
      </div>
    </div>
  );
};

export default Message;
