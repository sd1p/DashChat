"use client";

import timeConversion from "@/utils/timeConversion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useSelectedChat, useUser } from "@/queries";
import type { Chat, User } from "@/api";

interface ChatInfoProps {
  chat: Chat;
  onSelect: (chat: Chat) => void;
}

// For a 1-on-1 chat, the *other* participant (not the current user). Falls back
// to the first member. (Preserved from the legacy ChatInfo helper.)
const otherParticipant = (users: User[], meId?: string): User | undefined =>
  users.find((u) => u.id !== meId) ?? users[0];

// Ported from _legacy/src/components/Sidebar/ChatInfo.tsx. Selection state now
// comes from the SelectedChat context. Redesigned as a WhatsApp/Slack-style
// list row: avatar, title + preview, and a right column with time + unread
// badge. The active row gets a subtle fill plus an accent bar on its left edge.
const ChatInfo = ({ chat, onSelect }: ChatInfoProps) => {
  const { selectedChatId } = useSelectedChat();
  const { data: user } = useUser();

  const time = timeConversion(chat.latestMessage?.createdAt);
  const peer = otherParticipant(chat.users, user?.id);
  const avatar = chat.isGroupChat ? chat.users[0]?.photo : peer?.photo;
  const title = chat.isGroupChat ? chat.chatName : peer?.name;

  const isSelected = chat.id === selectedChatId;
  const unread = chat.notification ?? 0;
  const showBadge = unread > 0 && !isSelected;

  const preview =
    chat.isGroupChat && chat.latestMessage != null
      ? `${chat.latestMessage.sender?.name}: ${chat.latestMessage.content}`
      : chat.latestMessage?.content;

  return (
    <button
      type="button"
      onClick={() => onSelect(chat)}
      className={cn(
        "relative flex w-full items-center gap-3 px-3 py-2.5 text-left text-white transition-colors hover:bg-white/5",
        isSelected && "bg-white/10",
      )}
    >
      {/* Accent bar on the active row (Slack-style). */}
      <span
        className={cn(
          "absolute left-0 top-0 h-full w-0.5 bg-brand-accent transition-opacity",
          isSelected ? "opacity-100" : "opacity-0",
        )}
      />

      <Avatar className="size-11 shrink-0">
        <AvatarImage src={avatar} alt={title ?? ""} />
        <AvatarFallback className="bg-brand-dark text-sm text-white">
          {title?.[0]?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {title}
          </span>
          <span className="shrink-0 whitespace-nowrap text-[11px] text-white/50">
            {time}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-white/60">
            {preview}
          </p>
          {showBadge && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent px-1.5 text-[11px] font-semibold text-brand-dark">
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default ChatInfo;
