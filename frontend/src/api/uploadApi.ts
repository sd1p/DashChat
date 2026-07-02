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
// Allowed: images, PDF, Excel (.xls/.xlsx/.csv). 10 MB cap.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

// Extension fallback for when the browser reports a blank/generic MIME.
const ALLOWED_EXT = [".csv", ".xls", ".xlsx", ".pdf"];

// The `accept` attribute for the file input.
export const ACCEPTED_UPLOAD_ACCEPT =
  "image/*,application/pdf,.xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const okByExt = ALLOWED_EXT.some((e) => name.endsWith(e));
  if (!ALLOWED_MIME.has(file.type) && !okByExt) {
    return "Unsupported file type. Allowed: images, PDF, Excel";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File is too large (max 10 MB)";
  }
  return null;
}
