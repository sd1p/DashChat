"use client";

import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useCreateDirectChat,
  useSelectedChat,
  useUserSearch,
} from "@/queries";
import type { User } from "@/api";

// Ported from _legacy/src/components/Sidebar/Search.tsx.
// useUserSearch owns the fetch (cached, query-keyed) and useCreateDirectChat +
// selectChat open the chat. Redesigned with a shadcn-style search field: an
// inset icon and a rounded, muted input against the brand sidebar.
const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: results = [], isFetching } = useUserSearch(searchQuery);
  const createDirect = useCreateDirectChat();
  const { selectChat } = useSelectedChat();

  const handleOpenChat = async (user: User) => {
    try {
      const chat = await createDirect.mutateAsync(user.id);
      selectChat(chat.id);
      setSearchQuery("");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="border-b border-white/10">
      <div className="p-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
          <input
            type="text"
            placeholder="Find a user"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-md border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-brand-accent/60 focus:bg-black/30"
          />
        </div>
      </div>

      {searchQuery.trim() !== "" && results.length === 0 && !isFetching ? (
        <p className="px-3 pb-3 text-sm text-white/50">No user found</p>
      ) : (
        results.length > 0 && (
          <div className="pb-2">
            {results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleOpenChat(user)}
                disabled={createDirect.isPending}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-white transition-colors hover:bg-white/5 disabled:opacity-60"
              >
                <Avatar className="size-9">
                  <AvatarImage src={user.photo} alt={user.name} />
                  <AvatarFallback className="bg-brand-dark text-xs text-white">
                    {user.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm font-medium">{user.name}</span>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default Search;
