"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// The one piece of genuinely client-only UI state left after the Redux removal:
// which chat is currently open. In the old store this lived as
// currentChat.chatDetails (the whole object); now only the *id* is local state
// and the details come from useChatDetails(selectedChatId) — so the selection
// and the server data can't drift out of sync.
interface SelectedChatValue {
  selectedChatId: string | null;
  selectChat: (chatId: string | null) => void;
}

const SelectedChatContext = createContext<SelectedChatValue | null>(null);

export function SelectedChatProvider({ children }: { children: ReactNode }) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const value = useMemo<SelectedChatValue>(
    () => ({ selectedChatId, selectChat: setSelectedChatId }),
    [selectedChatId],
  );

  return (
    <SelectedChatContext.Provider value={value}>
      {children}
    </SelectedChatContext.Provider>
  );
}

export function useSelectedChat(): SelectedChatValue {
  const ctx = useContext(SelectedChatContext);
  if (!ctx) {
    throw new Error(
      "useSelectedChat must be used within a <SelectedChatProvider>",
    );
  }
  return ctx;
}
