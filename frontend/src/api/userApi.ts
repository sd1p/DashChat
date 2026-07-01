import { apiClient } from "./client";
import type { AuthResponse, User } from "./types";

// User endpoints (backend/routes/userRoutes.js). Login/register/logout are
// handled by Clerk on the frontend, so this only covers the local user record
// and user search.
export const userApi = {
  /** GET /api/user/auth — current authenticated user (Clerk-synced). */
  async getCurrent(): Promise<User> {
    const { data } = await apiClient.get<AuthResponse>("/api/user/auth");
    return data.user;
  },

  /** GET /api/user/find?search= — search users by name/email (excludes self). */
  async search(query: string): Promise<User[]> {
    const { data } = await apiClient.get<User[]>("/api/user/find", {
      params: { search: query },
    });
    return data;
  },
};
