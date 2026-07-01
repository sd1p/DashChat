"use client";

import { UserButton } from "@clerk/nextjs";
import { useUser } from "@/queries";

// Ported from _legacy/src/components/Sidebar/Navbar.tsx. The old SCSS: navbar
// bg #2f2d52 (brand-dark), 50px tall, text #ddddf7, logo hidden on tablet.
//
// The user's avatar is Clerk's <UserButton> alone — the old custom <Avatar>
// beside it duplicated the same photo, so it was removed. The name label stays.
const Navbar = () => {
  const { data: user } = useUser();

  return (
    <div className="flex h-[50px] items-center justify-between bg-brand-dark px-2.5 text-[#ddddf7]">
      <span className="font-bold max-md:hidden">DashChat</span>
      <div className="flex items-center gap-2.5">
        <span className="whitespace-nowrap text-sm">{user?.name}</span>
        {/* Clerk's UserButton: avatar + account menu + sign out. Post-sign-out
            redirect is configured on <ClerkProvider> in app/layout.tsx. */}
        <UserButton />
      </div>
    </div>
  );
};

export default Navbar;
