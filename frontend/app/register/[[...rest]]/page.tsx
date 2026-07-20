"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

// Registration is owned by Argus (our OIDC identity provider) — there's no local
// signup form. /register auto-starts the same Authorization Code + PKCE redirect
// to Argus, whose hosted auth UI offers sign-up. After sign-up Argus redirects
// back to /api/auth/callback/argus like any other login.
//
// The [[...rest]] catch-all preserves existing /register/* links.
export default function RegisterPage() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  useEffect(() => {
    void signIn("argus", { callbackUrl });
  }, [callbackUrl]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark p-4">
      <div className="flex flex-col items-center gap-4">
        <span className="text-2xl font-bold text-brand-accent">DashChat</span>
        <span className="text-sm text-white/60">Redirecting to sign up…</span>
      </div>
    </div>
  );
}
