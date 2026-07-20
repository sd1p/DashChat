import { getSession, signOut } from "next-auth/react";

// RP-initiated logout (OIDC). Clearing only the local Auth.js session is not
// enough: the Argus SSO session cookie stays valid, so the next /login redirect
// silently re-authenticates the user (that's the SSO feature). To actually log
// out we must ALSO end the Argus session via its end_session_endpoint, passing
// the id_token as `id_token_hint`. Argus then clears its cookie and redirects
// back to our post_logout_redirect_uri.
//
// ARGUS_ISSUER is not a NEXT_PUBLIC_* var, so the end-session origin is exposed
// to the client via NEXT_PUBLIC_ARGUS_ISSUER (falls back to same behavior if the
// id_token is missing — then we just do a local sign-out).
const ARGUS_ISSUER =
  process.env.NEXT_PUBLIC_ARGUS_ISSUER ?? "http://localhost:3000";
const END_SESSION = `${ARGUS_ISSUER.replace(/\/$/, "")}/api/auth/oauth2/end-session`;

export async function logout() {
  const session = await getSession();
  const idToken = session?.idToken;

  // Clear the local Auth.js session first (no redirect — we drive the browser
  // to Argus ourselves next).
  await signOut({ redirect: false });

  // Land on plain /login after logout. Because end-session clears the Argus
  // session cookie (see the hooks.after in the Argus config), /login can safely
  // auto-redirect into Argus — there's no session to bounce off, so the user
  // sees Argus's real login screen instead of being silently re-authenticated.
  const postLogout = `${window.location.origin}/login`;

  if (idToken) {
    const url = new URL(END_SESSION);
    url.searchParams.set("id_token_hint", idToken);
    url.searchParams.set("client_id", "dashchat");
    url.searchParams.set("post_logout_redirect_uri", postLogout);
    window.location.href = url.toString();
  } else {
    // No id_token to hint with — fall back to a local logout. The Argus session
    // may persist, but at least the app session is cleared.
    window.location.href = postLogout;
  }
}
