"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

// Login delegates entirely to Argus (our OIDC identity provider). There's no
// local login form — visiting /login auto-starts the Authorization Code + PKCE
// redirect to Argus's hosted /login (password / magic link / OTP / social /
// passkeys), which redirects back to /api/auth/callback/argus on success.
//
// We PAUSE the auto-redirect (showing a manual Sign-in button) only on
// `?error=...` — a failed callback (e.g. a transient error). Auto-redirecting
// there could tight-loop, so a manual click lets things settle first. After a
// normal sign-out the user lands on plain /login and is auto-redirected to
// Argus's real login screen (the Argus session cookie was cleared by
// end-session, so there's no silent re-auth).
//
// The optional catch-all ([[...rest]]) preserves old /login/* sub-paths.
export default function LoginPage() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const error = params.get("error");

  useEffect(() => {
    if (!error) void signIn("argus", { callbackUrl });
  }, [error, callbackUrl]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark p-4">
      <div className="flex flex-col items-center gap-4">
        <span className="text-2xl font-bold text-brand-accent">DashChat</span>
        {error ? (
          <>
            <span className="text-sm text-white/60">Sign-in was interrupted.</span>
            <button
              type="button"
              onClick={() => void signIn("argus", { callbackUrl })}
              className="rounded-md bg-brand-accent px-6 py-2.5 font-medium text-white transition hover:opacity-90"
            >
              Sign in
            </button>
          </>
        ) : (
          <span className="text-sm text-white/60">Redirecting to sign in…</span>
        )}
      </div>
    </div>
  );
}
