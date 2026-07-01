import { apiClient } from "./client";
import type { UploadResponse, UploadedAttachment } from "./types";

// Image upload endpoint (backend/routes/uploadRoutes.ts). Uploads a single
// image to S3 and returns its metadata; the caller then references that
// metadata in the next sendMessage call (upload-then-send).
export const uploadApi = {
  /**
   * POST /api/upload — multipart upload of one image.
   * @param onProgress fraction 0..1 for a progress bar (optional).
   */
  async upload(
    file: File,
    onProgress?: (fraction: number) => void
  ): Promise<UploadedAttachment> {
    const form = new FormData();
    form.append("file", file);

    const { data } = await apiClient.post<UploadResponse>("/api/upload", form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(e.loaded / e.total);
      },
    });
    return data.attachment;
  },
};

// Client-side guardrails mirroring the server (fast feedback before the POST).
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, GIF, or WebP images are allowed";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Image is too large (max 10 MB)";
  }
  return null;
}
