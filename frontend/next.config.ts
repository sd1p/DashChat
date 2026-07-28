import type { NextConfig } from "next";

// Backend = Express + Prisma REST API (deployed on Fly.io in Singapore).
//
// NOTE: in production the browser calls the backend DIRECTLY via
// NEXT_PUBLIC_API_ORIGIN (see src/api/client.ts) — NOT through this rewrite —
// because proxying every /api/* call through Vercel's server added a big
// cross-region hop. This rewrite remains as a fallback / for local dev, so a
// same-origin "/api/..." request still reaches the backend when the axios base
// URL isn't set (e.g. `bun run dev` with the backend on :5001).
//
// Realtime is served by Hermes (separate Socket.IO service), which the client
// connects to directly via NEXT_PUBLIC_HERMES_URL. The backend runs no socket.
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
