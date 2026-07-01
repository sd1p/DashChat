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
      <html lang="en">
        <body className="antialiased">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
