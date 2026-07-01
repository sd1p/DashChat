import asyncHandler from "express-async-handler";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { putObject } from "../lib/s3";

// Allowed image types. We re-verify the actual bytes with sharp below rather
// than trusting the client-supplied MIME type / extension.
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

// sharp reports formats with these names; map them to a MIME + extension we
// trust (derived from content, not the upload's filename).
const FORMAT_TO_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

// POST /api/upload  (multipart/form-data, field name "file")
//
// Uploads a single image to S3 and returns its metadata. The attachment is NOT
// yet tied to a message — the client sends the returned metadata along with the
// next sendMessage call (upload-then-send).
export const uploadImage = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ message: "No file provided (field name: file)" });
    return;
  }

  // Sniff the real image type + dimensions from the bytes. Throws if the buffer
  // isn't a decodable image, which also rejects spoofed non-images.
  let meta: sharp.Metadata;
  try {
    meta = await sharp(file.buffer).metadata();
  } catch {
    res.status(400).json({ message: "File is not a valid image" });
    return;
  }

  const mimeType = meta.format ? FORMAT_TO_MIME[meta.format] : undefined;
  if (!mimeType || !ALLOWED_MIME.has(mimeType)) {
    res.status(400).json({
      message: "Unsupported image type. Allowed: jpeg, png, gif, webp",
    });
    return;
  }

  const key = `chat-attachments/${req.user!.id}/${randomUUID()}.${EXT[mimeType]}`;

  await putObject({ key, body: file.buffer, contentType: mimeType });

  res.status(201).json({
    attachment: {
      key,
      mimeType,
      fileName: file.originalname,
      size: file.size,
      width: meta.width ?? null,
      height: meta.height ?? null,
    },
  });
});
