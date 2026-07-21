"use client";

import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

// Update the current user's name and/or avatar (PATCH /api/user). On success we
// write the returned record straight into the ["user"] cache so the Navbar
// avatar/name update immediately without a refetch. `onProgress` reports the
// avatar upload fraction (0..1) for a progress indicator.
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<
    User,
    Error,
    { name?: string; photo?: File; onProgress?: (fraction: number) => void }
  >({
    mutationFn: ({ name, photo, onProgress }) =>
      userApi.updateProfile({ name, photo }, onProgress),
    onSuccess: (user) => {
      queryClient.setQueryData<User>(queryKeys.user, user);
    },
  });
}
