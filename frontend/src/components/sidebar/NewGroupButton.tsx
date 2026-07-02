"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import NewGroupDialog from "./NewGroupDialog";

// Floating "+" action pinned to the bottom-right of the sidebar. Opens the
// group-creation dialog. Kept separate from Sidebar so the dialog's open state
// stays local to this control.
const NewGroupButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="New group chat"
        className="absolute bottom-4 right-4 flex size-12 items-center justify-center rounded-full bg-brand-accent text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
      >
        <Plus className="size-6" />
      </button>

      {open && <NewGroupDialog onClose={() => setOpen(false)} />}
    </>
  );
};

export default NewGroupButton;
