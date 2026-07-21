import { apiClient } from "./client";
import type { AuthResponse, UpdateProfileResponse, User } from "./types";

// User endpoints (backend/routes/userRoutes.ts). Login/register/logout are
// handled by Argus (the identity provider), so this only covers the local user
// record and user search.
export const userApi = {
  /** GET /api/user/auth — current authenticated user (Argus-synced). */
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

  /**
   * PATCH /api/user — update the current user's name and/or avatar.
   * Sends multipart/form-data: `name` (optional) and `photo` (optional File,
   * uploaded to S3). Returns the updated user with a directly-loadable photo URL.
   */
  async updateProfile(
    input: { name?: string; photo?: File },
    onProgress?: (fraction: number) => void,
  ): Promise<User> {
    const form = new FormData();
    if (input.name !== undefined) form.append("name", input.name);
    if (input.photo) form.append("photo", input.photo);

    const { data } = await apiClient.patch<UpdateProfileResponse>(
      "/api/user",
      form,
      {
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(e.loaded / e.total);
        },
      },
    );
    return data.user;
  },
};
