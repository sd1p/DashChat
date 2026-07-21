import asyncHandler from "express-async-handler";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { putObject, publicUrl } from "../lib/s3";

// Uploaded avatars are keyed under this prefix. The bucket allows public reads,
// so we store the resulting public URL directly on the user row (unlike chat
// attachments, which stay private and are signed per read).
const PROFILE_PHOTO_PREFIX = "profile-photos/";

// Search users by name/email, excluding the current user. Auth is enforced by
// the isAuthenticated middleware, which populates req.user from the verified
// Argus token.
export const findChats = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: "Protected Route" });
    return;
  }
  const keyword =
    typeof req.query.search === "string" ? req.query.search : undefined;

  const where: Prisma.UserWhereInput = {
    id: { not: req.user.id },
    ...(keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: "insensitive" } },
            { email: { contains: keyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({ where });
  res.send(users);
});

// Returns the local user record for the authenticated Argus session. If we
// reach here, isAuthenticated has already verified the token and synced the
// user, so req.user is present.
export const authUser = asyncHandler(async (req, res) => {
  res.status(200).json({ auth: true, user: req.user });
});

// Allowed avatar image types. Narrower than the chat-attachment allow-list
// (images only) since this is a profile picture.
const ALLOWED_AVATAR_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

// PATCH /api/user — update the current user's profile (name and/or avatar).
//
// `name`  : optional trimmed display name.
// `photo` : optional. Either a multipart file field "photo" (uploaded to S3
//           under profile-photos/<userId>/… and stored as its public URL), OR a
//           JSON body with `photo: "<url>"` to set a plain image URL directly.
//
// The stored value is always a directly-loadable URL, so no read-time signing
// is needed — every read path returns req.user / the row as-is.
export const updateProfile = asyncHandler(async (req, res) => {
  const current = req.user!;

  const data: Prisma.UserUpdateInput = {};

  // Name (from form field or JSON body).
  if (typeof req.body.name === "string") {
    const trimmed = req.body.name.trim();
    if (trimmed.length === 0) {
      res.status(400).json({ message: "Name cannot be empty" });
      return;
    }
    if (trimmed.length > 100) {
      res.status(400).json({ message: "Name is too long (max 100)" });
      return;
    }
    data.name = trimmed;
  }

  // Avatar: an uploaded file takes precedence over a body-supplied URL.
  if (req.file) {
    const mimeType = req.file.mimetype || "application/octet-stream";
    if (!ALLOWED_AVATAR_MIME.has(mimeType)) {
      res.status(400).json({
        message: "Unsupported image type. Allowed: JPEG, PNG, GIF, WebP",
      });
      return;
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9.]/g, "");
    const key = `${PROFILE_PHOTO_PREFIX}${current.id}/${randomUUID()}${safeExt}`;
    await putObject({ key, body: req.file.buffer, contentType: mimeType });
    data.photo = publicUrl(key);
  } else if (typeof req.body.photo === "string" && req.body.photo.trim()) {
    // Only accept absolute http(s) URLs here — never let the client set a raw
    // S3 key it doesn't own.
    const url = req.body.photo.trim();
    if (!/^https?:\/\//i.test(url)) {
      res.status(400).json({ message: "photo must be an http(s) URL" });
      return;
    }
    data.photo = url;
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ message: "Nothing to update" });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: current.id },
    data,
  });

  res.status(200).json({ user: updated });
});
