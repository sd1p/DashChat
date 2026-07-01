import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Register" };

// Replaces pages/LoginRegister/RegisterPage.tsx. The catch-all segment also
// absorbs the old /register/sso-callback path.
export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark p-4">
      <div className="flex flex-col items-center gap-4">
        <span className="text-2xl font-bold text-brand-accent">DashChat</span>
        <SignUp
          signInUrl="/login"
          forceRedirectUrl="/"
          fallbackRedirectUrl="/"
        />
      </div>
    </div>
  );
}
