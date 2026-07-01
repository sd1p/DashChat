import asyncHandler from "express-async-handler";
import prisma from "../config/prisma";
import { assertChatMember } from "../lib/chatAccess";

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
  const { content, chatId } = req.body as { content?: string; chatId?: string };
  if (!content || !chatId) {
    res.status(400).json({ message: "Provide valid content and chatId" });
    return;
  }

  if (!(await assertChatMember(chatId, req.user!.id, res))) return;

  const created = await prisma.message.create({
    data: { content, chatId, senderId: req.user!.id },
    include: {
      sender: true,
      chat: { include: { users: { include: { user: true } } } },
    },
  });

  // bump latestMessage + chat.updatedAt so chat lists re-sort
  await prisma.chat.update({
    where: { id: chatId },
    data: { latestMessageId: created.id, updatedAt: new Date() },
  });

  // Flatten chat.users (join rows -> User[]) so the socket payload matches the
  // shape the clients expect.
  const message = {
    ...created,
    chat: created.chat
      ? { ...created.chat, users: created.chat.users.map((cu) => cu.user) }
      : created.chat,
  };

  res.status(201).json({ message });
});

export const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!chatId) {
    res.status(400).json({ message: "chatId is required" });
    return;
  }

  if (!(await assertChatMember(chatId, req.user!.id, res))) return;

  const messages = await prisma.message.findMany({
    where: { chatId },
    include: { sender: true, chat: true },
    orderBy: { createdAt: "asc" },
  });

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
