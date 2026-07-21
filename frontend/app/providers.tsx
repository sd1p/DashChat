"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { SelectedChatProvider } from "@/queries";
import { ThemeProvider } from "@/lib/theme";
import SessionErrorHandler from "@/components/SessionErrorHandler";

// App-wide client providers. React Query replaces Redux Toolkit as the source
// of truth for server state (user, chats, messages). One QueryClient per
// browser tab, created lazily in state so it survives re-renders but isn't
// shared across requests on the server.
export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <SessionErrorHandler />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SelectedChatProvider>{children}</SelectedChatProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </SessionProvider>
  );
}
