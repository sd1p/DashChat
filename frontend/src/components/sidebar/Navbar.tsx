"use client";

import { useEffect, useState } from "react";
import { LogOut, MessageSquare } from "lucide-react";
import { useUser } from "@/queries";
import { logout } from "@/lib/logout";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileDialog from "./ProfileDialog";

// Ported from _legacy/src/components/Sidebar/Navbar.tsx. The old SCSS: navbar
// bg #2f2d52 (brand-dark), text #ddddf7.
//
// Redesigned as a shadcn-style app header: brand mark on the left, name + avatar
// + sign-out on the right. Sign-out clears the Auth.js session and returns to
// /login (account management itself lives on Argus, the identity provider).
const Navbar = () => {
  const { data: user } = useUser();

  // The avatar/sign-out control is client-only (it reads session state). Gate it
  // behind a mounted flag so the server and first client render agree (a
  // placeholder), then swap in the real control after hydration. A same-sized
  // placeholder avoids layout shift.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Profile-edit modal, opened by clicking the avatar.
  const [profileOpen, setProfileOpen] = useState(false);

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
        {/* Avatar (opens the profile-edit modal) + sign-out. Sign-out ends the
            Auth.js session and returns to /login. */}
        {mounted ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Edit profile"
              className="rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand-accent/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user?.photo}
                alt=""
                className="size-7 rounded-full object-cover"
              />
            </button>
            <button
              type="button"
              onClick={() => logout()}
              aria-label="Sign out"
              className="grid size-7 place-items-center rounded-md text-chat-header-fg/70 hover:bg-white/10 hover:text-chat-header-fg"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          <div className="size-7 rounded-full bg-white/10" aria-hidden />
        )}
      </div>

      {profileOpen && user && (
        <ProfileDialog user={user} onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
};

export default Navbar;
