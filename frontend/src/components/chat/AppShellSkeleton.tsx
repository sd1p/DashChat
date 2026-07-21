import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Full-app loading placeholder shown while the Auth.js session is still
// resolving (before we know who the user is). Mirrors ChatHome's layout — a
// sidebar rail (header, search, chat rows) beside the conversation pane — so
// the app reveals its shape instead of a blank screen, then swaps to the live
// UI once the session is authenticated.
const AppShellSkeleton = () => {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Sidebar rail */}
      <div className="flex h-full w-full shrink-0 flex-col overflow-hidden border-r border-white/10 bg-brand-sidebar md:w-80 lg:w-96">
        {/* Header: brand mark + name/avatar placeholders */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-brand-dark px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-brand-accent/20 text-brand-accent">
              <MessageSquare className="size-4" />
            </div>
            <span className="text-base font-semibold tracking-tight text-chat-header-fg">
              DashChat
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-4 w-20 rounded bg-white/10" />
            <Skeleton className="size-7 rounded-full bg-white/10" />
          </div>
        </div>

        {/* Search bar placeholder */}
        <div className="p-3">
          <Skeleton className="h-9 w-full rounded-md bg-white/10" />
        </div>

        {/* Chat row placeholders */}
        <div className="flex-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex w-full items-center gap-3 px-3 py-2.5">
              <Skeleton className="size-11 shrink-0 rounded-full bg-white/10" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/5 rounded bg-white/10" />
                <Skeleton className="h-3 w-3/5 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation pane placeholder (desktop only, like Welcome). */}
      <div className="hidden h-full min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-chat-surface md:flex">
        <Skeleton className="size-16 rounded-2xl bg-white/10" />
        <Skeleton className="h-8 w-64 rounded bg-white/10" />
        <Skeleton className="h-5 w-48 rounded bg-white/10" />
      </div>
    </div>
  );
};

export default AppShellSkeleton;
