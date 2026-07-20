import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

// Render every route dynamically instead of statically prerendering at build
// time. The app is session-aware (Auth.js) and auth-gated, so rendering depends
// on request-time session state rather than build-time constants. Forcing
// dynamic rendering keeps Docker/CI builds from needing any auth config baked
// in. Applies to all nested routes via the root layout.
export const dynamic = "force-dynamic";

// Replaces the old react-helmet <Helmet> usage. Per-page titles override this
// via each route's own `metadata` export.
export const metadata: Metadata = {
  title: {
    default: "DashChat",
    template: "%s · DashChat",
  },
  description: "A real-time chat app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* suppressHydrationWarning: browser extensions (ColorZilla, Grammarly,
          etc.) inject attributes like `cz-shortcut-listen` onto <html>/<body>
          before React hydrates, which would otherwise trip a hydration
          mismatch. This suppresses the warning for these two elements only. */}
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Apply the persisted theme before first paint so there's no theme
              flash. Defaults to dark when nothing is stored. Mirrors the logic
              in src/lib/theme.tsx. */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('dashchat-theme')||'dark';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();`,
            }}
          />
        </head>
        <body className="antialiased" suppressHydrationWarning>
          <Providers>{children}</Providers>
        </body>
      </html>
    </>
  );
}
