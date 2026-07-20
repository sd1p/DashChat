"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { userApi, type User } from "@/api";
import { queryKeys } from "./keys";

// Fetches the local user record for the current Argus session. The backend
// JIT-creates the row on this call, so the rest of the app gets user.id etc.
//
// Gated on the Auth.js session status (the `enabled` flag): the query stays idle
// until the session is confirmed authenticated, so it never fires an
// unauthenticated request during hydration.
export function useUser() {
  const { status } = useSession();

  return useQuery<User>({
    queryKey: queryKeys.user,
    queryFn: () => userApi.getCurrent(),
    enabled: status === "authenticated",
    staleTime: 5 * 60_000, // user record rarely changes within a session
  });
}
