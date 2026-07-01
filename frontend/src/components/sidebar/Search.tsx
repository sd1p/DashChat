"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  useCreateDirectChat,
  useSelectedChat,
  useUserSearch,
} from "@/queries";
import type { User } from "@/api";

// Ported from _legacy/src/components/Sidebar/Search.tsx.
// Old: a useEffect manually called userApi.search on every query change and
// kept results in local state; clicking a result did chatApi.createDirect then
// dispatched fetchChat/fetchChatDetails. Now useUserSearch owns the fetch
// (cached, query-keyed) and useCreateDirectChat + selectChat open the chat.
const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: results = [] } = useUserSearch(searchQuery);
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
    <div className="border-b border-border/40">
      <div className="p-2.5">
        <Input
          type="text"
          placeholder="Find a user"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-none bg-transparent text-white placeholder:text-gray-300 focus-visible:ring-0"
        />
      </div>
      {results.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => handleOpenChat(user)}
          disabled={createDirect.isPending}
          className="flex w-full items-center gap-2.5 p-2.5 text-left text-white hover:bg-brand-dark disabled:opacity-60"
        >
          <Avatar className="size-12">
            <AvatarImage src={user.photo} alt={user.name} />
            <AvatarFallback>{user.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-lg font-bold">{user.name}</span>
        </button>
      ))}
    </div>
  );
};

export default Search;
