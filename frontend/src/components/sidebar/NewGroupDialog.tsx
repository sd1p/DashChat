"use client";

import { useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateGroupChat,
  useSelectedChat,
  useUserSearch,
} from "@/queries";
import type { User } from "@/api";

// Modal to create a group chat: name it, search users, pick 2+ members, create.
// Mirrors the direct-chat flow in Search.tsx (useUserSearch owns the fetch) but
// accumulates a selection and calls useCreateGroupChat instead of opening a
// 1-on-1 immediately. Rendered/dismissed by NewGroupButton.
const NewGroupDialog = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<User[]>([]);

  const { data: results = [], isFetching } = useUserSearch(searchQuery);
  const createGroup = useCreateGroupChat();
  const { selectChat } = useSelectedChat();

  const toggleMember = (user: User) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    );
  };

  // Backend requires a name and at least the picked users (it adds the creator).
  // One other member + the creator = a 2-member group, which is allowed.
  const canCreate =
    name.trim() !== "" && selected.length >= 1 && !createGroup.isPending;

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      const chat = await createGroup.mutateAsync({
        name: name.trim(),
        users: selected.map((u) => u.id),
      });
      selectChat(chat.id);
      onClose();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-md flex-col gap-0 overflow-hidden border-white/10 bg-brand-sidebar p-0 text-white">
        <DialogHeader className="border-b border-white/10 px-4 py-3">
          <DialogTitle className="text-sm">New group chat</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {/* Group name */}
          <Input
            type="text"
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-white/10 bg-black/20 text-white placeholder:text-white/40 focus-visible:border-brand-accent/60"
          />

          {/* Selected members as removable chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleMember(user)}
                  className="flex items-center gap-1 rounded-full bg-brand-accent/20 py-1 pl-1 pr-2 text-xs text-white transition-colors hover:bg-brand-accent/30"
                >
                  <Avatar className="size-5">
                    <AvatarImage src={user.photo} alt={user.name} />
                    <AvatarFallback className="bg-brand-dark text-[10px] text-white">
                      {user.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-32 truncate">{user.name}</span>
                  <X className="size-3" />
                </button>
              ))}
            </div>
          )}

          {/* Member search */}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
            <Input
              type="text"
              placeholder="Add members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-white/10 bg-black/20 pl-9 text-white placeholder:text-white/40 focus-visible:border-brand-accent/60"
            />
          </div>

          {/* Search results */}
          {searchQuery.trim() !== "" && results.length === 0 && !isFetching ? (
            <p className="text-sm text-white/50">No user found</p>
          ) : (
            results.length > 0 && (
              <div className="flex flex-col">
                {results.map((user) => {
                  const isSelected = selected.some((u) => u.id === user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleMember(user)}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-white transition-colors hover:bg-white/5"
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
                      {isSelected && (
                        <span className="text-xs text-brand-accent">Added</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>

        <DialogFooter className="border-t border-white/10 px-4 py-3">
          <Button variant="ghost" onClick={onClose} className="text-white/70">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>
            {createGroup.isPending ? "Creating…" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewGroupDialog;
