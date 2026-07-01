import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Log In" };

// Replaces pages/LoginRegister/LoginPage.tsx. The optional catch-all segment
// ([[...rest]]) lets Clerk own every /login/* sub-path — including the old
// /login/sso-callback that App.tsx used to wire up by hand.
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark p-4">
      <div className="flex flex-col items-center gap-4">
        <span className="text-2xl font-bold text-brand-accent">DashChat</span>
        <SignIn
          signUpUrl="/register"
          forceRedirectUrl="/"
          fallbackRedirectUrl="/"
        />
      </div>
    </div>
  );
}
