import type { NextConfig } from "next";

// Backend (Express + Prisma REST API) runs on :5001. We proxy the REST API
// through Next so the browser keeps using same-origin relative URLs
// (axios "/api/...") — the equivalent of the old vite.config.js `server.proxy`.
//
// Realtime is NOT proxied here: it's served by Hermes (a separate Socket.IO
// service), which the client connects to directly via NEXT_PUBLIC_HERMES_URL
// (see src/components/chat/useChatSocket.ts). The backend no longer runs a
// socket server.
//
// Override the API target with NEXT_PUBLIC_API_ORIGIN if the backend moves.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://127.0.0.1:5001";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) so the production
  // Docker image only needs the traced node_modules — see frontend/Dockerfile.
  output: "standalone",

  // The repo has lockfiles at both the monorepo root and frontend/; pin the
  // Turbopack root to this app so Next doesn't infer the wrong workspace root.
  turbopack: {
    root: import.meta.dirname,
  },
  async rewrites() {
    return [
      // Forward the REST API to the Express backend — EXCEPT /api/auth/*, which
      // Auth.js (NextAuth) owns for the OIDC sign-in flow and must be handled by
      // Next itself. The negative lookahead keeps Auth.js routes local.
      {
        source: "/api/:path((?!auth/).*)",
        destination: `${API_ORIGIN}/api/:path`,
      },
    ];
  },
};

export default nextConfig;
