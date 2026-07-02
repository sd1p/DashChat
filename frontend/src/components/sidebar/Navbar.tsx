"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { MessageSquare } from "lucide-react";
import { useUser } from "@/queries";
import ThemeToggle from "@/components/ThemeToggle";

// Ported from _legacy/src/components/Sidebar/Navbar.tsx. The old SCSS: navbar
// bg #2f2d52 (brand-dark), text #ddddf7.
//
// The user's avatar is Clerk's <UserButton> alone. Redesigned as a shadcn-style
// app header: brand mark on the left, name + account menu on the right.
const Navbar = () => {
  const { data: user } = useUser();

  // Clerk's <UserButton> renders a client-only widget (it depends on the
  // browser Clerk instance) and its server markup doesn't match the client,
  // causing a hydration mismatch. Gate it behind a mounted flag so the server
  // and first client render agree (a placeholder), then swap in the real
  // button after hydration. A same-sized placeholder avoids layout shift.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-brand-dark px-4 text-chat-header-fg">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-brand-accent/20 text-brand-accent">
          <MessageSquare className="size-4" />
        </div>
        <span className="text-base font-semibold tracking-tight">DashChat</span>
      </div>
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <span className="max-w-[8rem] truncate text-sm text-chat-header-fg/80">
          {user?.name}
        </span>
        {/* Clerk's UserButton: avatar + account menu + sign out. Post-sign-out
            redirect is configured on <ClerkProvider> in app/layout.tsx. */}
        {mounted ? (
          <UserButton />
        ) : (
          <div className="size-7 rounded-full bg-white/10" aria-hidden />
        )}
      </div>
    </div>
  );
};

export default Navbar;
