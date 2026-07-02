"use client";

import timeConversion from "@/utils/timeConversion";
import { cn } from "@/lib/utils";
import { useUser } from "@/queries";
import type { Message as MessageType } from "@/api";
import MessageAttachments from "./MessageAttachments";
import LinkPreviewCard from "./LinkPreviewCard";
import MessageText from "./MessageText";

interface MessageProps {
  message: MessageType;
  /** In group chats we label peer bubbles with the sender's name. */
  isGroupChat?: boolean;
  /** First message of a run from the same sender — gets the little tail. */
  startsRun?: boolean;
}

// A small palette of stable colors for group-sender name labels, keyed off the
// sender id so a given person keeps the same color. These reference the theme
// tokens (--chat-name-*) so they follow the app theme / dark mode.
const NAME_COLORS = [
  "var(--chat-name-1)",
  "var(--chat-name-2)",
  "var(--chat-name-3)",
  "var(--chat-name-4)",
  "var(--chat-name-5)",
  "var(--chat-name-6)",
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
// palette: own messages on the accent (chat-bubble-own), peers on white.
const Message = ({ message, isGroupChat, startsRun }: MessageProps) => {
  const { data: user } = useUser();
  const time = timeConversion(message.createdAt);
  const isOwner = message.sender?.id === user?.id;
  const showName = isGroupChat && !isOwner && startsRun;
  const attachments = message.attachments ?? [];
  const hasAttachments = attachments.length > 0;
  const preview = message.linkPreview ?? null;
  const hasText = !!message.content;
  // Anything that gives the bubble a fixed-width child uses the column layout.
  const isRich = hasAttachments || !!preview;

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
          // With a fixed-width child (image or preview card), hug the content
          // (w-fit) so the bubble wraps it instead of stretching to max width.
          isRich && "flex w-fit flex-col",
          isOwner
            ? "bg-chat-bubble-own text-white"
            : "bg-chat-bubble-peer text-chat-bubble-peer-fg",
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
                ? "-right-[6px] border-l-chat-bubble-own border-t-chat-bubble-own"
                : "-left-[6px] border-r-chat-bubble-peer border-t-chat-bubble-peer",
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

        {isRich ? (
          // Rich layout: fixed-width media/preview sets the bubble width; text +
          // time sit beneath it in a row (no floats — those break w-fit).
          <>
            {hasAttachments && (
              <MessageAttachments attachments={attachments} isOwner={isOwner} />
            )}
            {preview && <LinkPreviewCard preview={preview} isOwner={isOwner} />}
            <div className="mt-1 flex items-end justify-between gap-2">
              {hasText && (
                <MessageText text={message.content!} isOwner={isOwner} />
              )}
              <span
                className={cn(
                  "ml-auto shrink-0 translate-y-0.5 text-[10px]",
                  isOwner ? "text-white/70" : "text-gray-400",
                )}
              >
                {time}
              </span>
            </div>
          </>
        ) : (
          // Text-only layout: time floated to the end so it wraps naturally.
          <>
            <MessageText text={message.content ?? ""} isOwner={isOwner} />
            <span
              className={cn(
                "float-right ml-2 mt-1 translate-y-0.5 text-[10px]",
                isOwner ? "text-white/70" : "text-gray-400",
              )}
            >
              {time}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default Message;
