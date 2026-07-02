"use client";

import { useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useAddGroupMember,
  useRemoveGroupMember,
  useUser,
  useUserSearch,
} from "@/queries";
import type { Chat, User } from "@/api";

// Admin-only dialog to manage a group's members: lists current members with a
// remove button, and a search box to add new ones. Reuses useUserSearch (which
// excludes self) and filters out users already in the group. Add/remove call
// the group mutations, which update the cached chat details so the member list
// re-renders in place. Opened from the "Add people" icon in Chat.tsx.
const AddMemberDialog = ({
  chat,
  onClose,
}: {
  chat: Chat;
  onClose: () => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: results = [], isFetching } = useUserSearch(searchQuery);
  const { data: me } = useUser();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const memberIds = new Set(chat.users.map((u) => u.id));
  const candidates = results.filter((u) => !memberIds.has(u.id));
  const busy = addMember.isPending || removeMember.isPending;

  const handleAdd = async (user: User) => {
    try {
      await addMember.mutateAsync({ groupId: chat.id, userId: user.id });
      // The mutation updates the cached chat details, so the added user drops
      // out of `candidates` and into the member list on the next render.
    } catch (error) {
      console.log(error);
    }
  };

  const handleRemove = async (user: User) => {
    try {
      await removeMember.mutateAsync({ groupId: chat.id, userId: user.id });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-white/10 bg-brand-sidebar shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Manage members</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {/* Member search (add) */}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Add a user"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-md border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-brand-accent/60 focus:bg-black/30"
            />
          </div>

          {/* Search results (candidates to add) */}
          {searchQuery.trim() !== "" && candidates.length === 0 && !isFetching ? (
            <p className="text-sm text-white/50">No user found</p>
          ) : (
            candidates.length > 0 && (
              <div className="flex flex-col">
                {candidates.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleAdd(user)}
                    disabled={busy}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-white transition-colors hover:bg-white/5 disabled:opacity-60"
                  >
                    <Avatar className="size-9">
                      <AvatarImage src={user.photo} alt={user.name} />
                      <AvatarFallback className="bg-brand-dark text-xs text-white">
                        {user.name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm font-medium">
                      {user.name}
                    </span>
                    <span className="text-xs text-brand-accent">Add</span>
                  </button>
                ))}
              </div>
            )
          )}

          {/* Current members */}
          <div>
            <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-white/40">
              Members · {chat.users.length}
            </p>
            <div className="flex flex-col">
              {chat.users.map((user) => {
                const isSelf = user.id === me?.id;
                const isGroupAdmin = user.id === chat.groupAdminId;
                return (
                  <div
                    key={user.id}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-white"
                  >
                    <Avatar className="size-9">
                      <AvatarImage src={user.photo} alt={user.name} />
                      <AvatarFallback className="bg-brand-dark text-xs text-white">
                        {user.name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm font-medium">
                      {user.name}
                    </span>
                    {/* Fixed-width trailing slot so "Admin" / "Remove" align down the column. */}
                    <div className="flex w-16 justify-end">
                      {isGroupAdmin ? (
                        <span className="px-2 py-1 text-xs font-medium text-brand-accent">
                          Admin
                        </span>
                      ) : (
                        // The admin can remove anyone but themselves.
                        !isSelf && (
                          <button
                            type="button"
                            onClick={() => handleRemove(user)}
                            disabled={busy}
                            aria-label={`Remove ${user.name}`}
                            className="rounded-md px-2 py-1 text-xs font-medium text-white/50 transition-colors hover:bg-red-500/20 hover:text-red-400 disabled:opacity-60"
                          >
                            Remove
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMemberDialog;
