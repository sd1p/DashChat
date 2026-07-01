import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Providers from "./providers";
import "./globals.css";

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
    <ClerkProvider afterSignOutUrl="/login">
      {/* suppressHydrationWarning: browser extensions (ColorZilla, Grammarly,
          etc.) inject attributes like `cz-shortcut-listen` onto <html>/<body>
          before React hydrates, which would otherwise trip a hydration
          mismatch. This suppresses the warning for these two elements only. */}
      <html lang="en" suppressHydrationWarning>
        <body className="antialiased" suppressHydrationWarning>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
