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
// comes from the SelectedChat context instead of currentChat.chatDetails.
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
        "flex w-full items-center gap-4 border-b border-white/20 p-[11px] text-left text-white hover:bg-brand-dark",
        isSelected && "bg-brand-dark",
      )}
    >
      <Avatar className="size-12">
        <AvatarImage src={avatar} alt={title ?? ""} />
        <AvatarFallback>{title?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 overflow-hidden">
        <span className="text-lg font-bold">{title}</span>
        <p className="h-[1.5em] max-w-[33vh] truncate text-sm text-gray-300">
          {preview}
        </p>
      </div>

      <div className="ml-auto mr-2.5 flex flex-col items-center gap-[9px]">
        <span className="whitespace-nowrap text-xs text-white/60">{time}</span>
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full bg-[#6080ea] text-xs text-white/75",
            showBadge ? "visible" : "invisible",
          )}
        >
          {unread > 0 ? unread : ""}
        </span>
      </div>
    </button>
  );
};

export default ChatInfo;
