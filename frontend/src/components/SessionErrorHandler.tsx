"use client";

import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

// Watches the Auth.js session for a refresh error. When auth.ts's jwt callback
// fails to renew the Argus access token (refresh token expired/revoked), it sets
// `session.error = "RefreshTokenError"`. Every API call would then 401, so
// instead of waiting for that, we proactively end the local session and bounce
// to /login. The Argus SSO cookie usually survives, so /login silently
// re-authenticates the user — a seamless recovery rather than a hard logout.
//
// Mounted once, app-wide, in providers.tsx.
export default function SessionErrorHandler() {
  const { data: session } = useSession();
  const handled = useRef(false);

  useEffect(() => {
    if (session?.error === "RefreshTokenError" && !handled.current) {
      handled.current = true;
      void signOut({ callbackUrl: "/login" });
    }
  }, [session?.error]);

  return null;
}
