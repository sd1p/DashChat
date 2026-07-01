"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { userApi, type User } from "@/api";
import { queryKeys } from "./keys";

// Replaces userSlice + the fetchUser thunk that App.tsx fired once Clerk
// confirmed a session. The backend JIT-creates the local user record on this
// call, so the rest of the app gets user.id etc.
//
// Gated on Clerk's isSignedIn (the `enabled` flag) — the equivalent of the old
// `if (isLoaded && isSignedIn) dispatch(fetchUser())` guard. Until Clerk loads,
// the query stays idle instead of firing an unauthenticated request.
export function useUser() {
  const { isLoaded, isSignedIn } = useAuth();

  return useQuery<User>({
    queryKey: queryKeys.user,
    queryFn: () => userApi.getCurrent(),
    enabled: isLoaded && isSignedIn === true,
    staleTime: 5 * 60_000, // user record rarely changes within a session
  });
}
