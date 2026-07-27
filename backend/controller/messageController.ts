import asyncHandler from "express-async-handler";
import prisma from "../config/prisma";
import { assertChatMember } from "../lib/chatAccess";
import { serializeMessageAttachments } from "../lib/attachments";
import { fetchLinkPreview } from "../lib/linkPreview";
import { grantChatAccess, notifyNewMessage } from "../lib/hermes";

// Columns selected for attachments on any message read. `key` is included so we
// can sign it; serializeMessageAttachments strips it before responding.
const attachmentSelect = {
  id: true,
  key: true,
  mimeType: true,
  fileName: true,
  size: true,
  width: true,
  height: true,
  createdAt: true,
} as const;

// Shape the client sends after uploading via /api/upload.
type IncomingAttachment = {
  key: string;
  mimeType: string;
  fileName: string;
  size: number;
  width?: number | null;
  height?: number | null;
};

// Mark a chat read for a user by pointing their read receipt at the newest
// message (replaces the old lastSeen timestamp map; id-based avoids boundary
// bugs and never contends across users — one row per (chat, user)).
async function markChatRead(chatId: string, userId: string) {
  const latest = await prisma.message.findFirst({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  await prisma.chatRead.upsert({
    where: { chatId_userId: { chatId, userId } },
    create: { chatId, userId, lastReadMessageId: latest?.id ?? null },
    update: { lastReadMessageId: latest?.id ?? null },
  });
}

export const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, attachments } = req.body as {
    content?: string;
    chatId?: string;
    attachments?: IncomingAttachment[];
  };

  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  const trimmed = content?.trim();

  if (!chatId) {
    res.status(400).json({ message: "chatId is required" });
    return;
  }
  // A message must carry text or at least one attachment (or both).
  if (!trimmed && !hasAttachments) {
    res
      .status(400)
      .json({ message: "Provide message content or an attachment" });
    return;
  }

  if (!(await assertChatMember(chatId, req.user!.id, res))) return;

  // Unfurl the first URL in the text (if any) before creating the message so the
  // preview rides along in the response + socket payload. Never throws — a
  // failed fetch just yields null (no preview). Skipped when there's no text.
  const preview = trimmed ? await fetchLinkPreview(trimmed) : null;

  const created = await prisma.message.create({
    data: {
      content: trimmed || null,
      chatId,
      senderId: req.user!.id,
      ...(hasAttachments && {
        attachments: {
          create: attachments!.map((a) => ({
            key: a.key,
            mimeType: a.mimeType,
            fileName: a.fileName,
            size: a.size,
            width: a.width ?? null,
            height: a.height ?? null,
          })),
        },
      }),
      ...(preview && {
        linkPreview: {
          create: {
            url: preview.url,
            title: preview.title,
            description: preview.description,
            imageUrl: preview.imageUrl,
            siteName: preview.siteName,
          },
        },
      }),
    },
    include: {
      sender: true,
      chat: { include: { users: { include: { user: true } } } },
      attachments: { select: attachmentSelect },
      linkPreview: true,
    },
  });

  // bump latestMessage + chat.updatedAt so chat lists re-sort
  await prisma.chat.update({
    where: { id: chatId },
    data: { latestMessageId: created.id, updatedAt: new Date() },
  });

  // The sender has, by definition, seen their own message — advance their read
  // pointer to it so their chat never shows an unread badge for it.
  await markChatRead(chatId, req.user!.id);

  // Flatten chat.users (join rows -> User[]) so the socket payload matches the
  // shape the clients expect, and swap attachment keys for signed URLs.
  const message = await serializeMessageAttachments({
    ...created,
    chat: created.chat
      ? { ...created.chat, users: created.chat.users.map((cu) => cu.user) }
      : created.chat,
  });

  // Fan the saved message out to every recipient via Hermes (the authoritative
  // backend→client path that replaced the old client-emitted `newMessage`).
  // Best-effort — a Redis/Hermes hiccup must not fail the send.
  //
  // Target each recipient by their Argus subject (authId), NOT the local user
  // id: Hermes joins every socket to `user:<token.sub>`, and the token sub is
  // the Argus id. Emitting to `user:<localId>` would land in an empty room.
  const recipientAuthIds = (created.chat?.users ?? [])
    .map((cu) => cu.user.authId)
    .filter((authId) => authId !== req.user!.authId);
  await notifyNewMessage(message, recipientAuthIds);

  res.status(201).json({ message });
});

export const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!chatId) {
    res.status(400).json({ message: "chatId is required" });
    return;
  }

  if (!(await assertChatMember(chatId, req.user!.id, res))) return;

  // Authorize this member's sockets to join the chat's Hermes room, so typing
  // relays and any future room broadcasts reach them. Argus clients can't join
  // arbitrary rooms without a backend grant. Grant targets the user by their
  // Argus subject (authId) — Hermes keys grants by `user:<token.sub>`, so a
  // local id here would grant the wrong user. Best-effort.
  await grantChatAccess(req.user!.authId, chatId);

  const rows = await prisma.message.findMany({
    where: { chatId },
    include: {
      sender: true,
      chat: true,
      attachments: { select: attachmentSelect },
      linkPreview: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Mint signed URLs for every attachment across all messages.
  const messages = await Promise.all(
    rows.map((m) => serializeMessageAttachments(m))
  );

  await markChatRead(chatId, req.user!.id);

  res.status(200).json({ messages });
});

export const markAsSeen = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!chatId) {
    res.status(400).json({ message: "chatId is required" });
    return;
  }
  if (!(await assertChatMember(chatId, req.user!.id, res))) return;
  await markChatRead(chatId, req.user!.id);
  res.status(200).json({ message: `seen ${chatId}` });
});
