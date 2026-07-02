import asyncHandler from "express-async-handler";
import { randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { putObject } from "../lib/s3";

// Allowed attachment types: images, PDF, and Excel/CSV. Capped at 10 MB
// (enforced by multer in the route). Files are stored raw; images additionally
// get their pixel dimensions sniffed (best-effort).
const ALLOWED_MIME = new Set([
  // images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // pdf
  "application/pdf",
  // excel / csv
  "application/vnd.ms-excel", // .xls (and some browsers use this for .csv)
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/csv",
]);

// Some browsers send a blank/octet-stream MIME for .csv/.xls — fall back to the
// file extension so those still pass the allow-list.
const EXT_TO_MIME: Record<string, string> = {
  ".csv": "text/csv",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pdf": "application/pdf",
};

// POST /api/upload  (multipart/form-data, field name "file")
//
// Uploads a single file to S3 and returns its metadata. The attachment is NOT
// yet tied to a message — the client sends the returned metadata along with the
// next sendMessage call (upload-then-send).
export const uploadImage = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ message: "No file provided (field name: file)" });
    return;
  }

  const ext = path.extname(file.originalname).toLowerCase();
  // Trust the declared MIME, but recover a known type from the extension when
  // the browser sends a generic one.
  let mimeType = file.mimetype || "application/octet-stream";
  if (!ALLOWED_MIME.has(mimeType) && EXT_TO_MIME[ext]) {
    mimeType = EXT_TO_MIME[ext];
  }

  if (!ALLOWED_MIME.has(mimeType)) {
    res.status(400).json({
      message: "Unsupported file type. Allowed: images, PDF, Excel (.xls/.xlsx/.csv)",
    });
    return;
  }

  // For images, sniff real dimensions from the bytes (best-effort; non-images
  // and undecodable files just get null width/height).
  let width: number | null = null;
  let height: number | null = null;
  if (mimeType.startsWith("image/")) {
    try {
      const meta = await sharp(file.buffer).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      // Not a decodable image — fine, store it raw with null dimensions.
    }
  }

  // Preserve the original extension so downloads keep a sensible filename/type.
  const safeExt = ext.replace(/[^a-z0-9.]/g, "");
  const key = `chat-attachments/${req.user!.id}/${randomUUID()}${safeExt}`;

  await putObject({ key, body: file.buffer, contentType: mimeType });

  res.status(201).json({
    attachment: {
      key,
      mimeType,
      fileName: file.originalname,
      size: file.size,
      width,
      height,
    },
  });
});
