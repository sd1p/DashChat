import asyncHandler from "express-async-handler";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { assertChatMember } from "../lib/chatAccess";

// Standard include to hydrate a chat for the API response.
const chatInclude = {
  users: { include: { user: true } },
  groupAdmin: true,
  latestMessage: { include: { sender: true } },
} satisfies Prisma.ChatInclude;

// A chat as returned by Prisma with the standard include above.
type ChatWithRelations = Prisma.ChatGetPayload<{ include: typeof chatInclude }>;

// Flatten the ChatUser join rows into a plain User[] so the API exposes
// `users: User[]` rather than leaking the join-table shape. Everything else is
// returned as-is from Prisma (raw `id`, nested `sender`/`groupAdmin`).
function flattenChat(
  chat: (ChatWithRelations & { notification?: number }) | null
) {
  if (!chat) return null;
  return {
    ...chat,
    users: chat.users.map((cu) => cu.user),
  };
}

// 1-on-1 chat: find existing or create.
export const createChat = asyncHandler(async (req, res) => {
  const me = req.user!.id;
  const other: string = req.body.userId;

  const existing = await prisma.chat.findFirst({
    where: {
      isGroupChat: false,
      AND: [
        { users: { some: { userId: me } } },
        { users: { some: { userId: other } } },
      ],
    },
    include: chatInclude,
  });

  if (existing) {
    res.status(200).json(flattenChat(existing));
    return;
  }

  const created = await prisma.chat.create({
    data: {
      chatName: "SingleChat",
      isGroupChat: false,
      users: { create: [{ userId: me }, { userId: other }] },
      // initialize read pointers (null = unread), mirrors old lastSeen map
      reads: { create: [{ userId: me }, { userId: other }] },
    },
    include: chatInclude,
  });

  res.status(201).json(flattenChat(created));
});

export const getAllChats = asyncHandler(async (req, res) => {
  const me = req.user!.id;

  const chats = await prisma.chat.findMany({
    where: { users: { some: { userId: me } } },
    include: chatInclude,
    orderBy: { updatedAt: "desc" },
  });

  // Unread counts for ALL my chats in ONE query (replaces the per-chat N+1).
  // A message is unread if it's newer than my last-read message
  // (no read pointer / null => everything is unread).
  // NOTE: these Prisma models don't @map their columns, so Postgres stores them
  // as quoted camelCase ("chatId", "userId", "createdAt", "lastReadMessageId") —
  // NOT snake_case. Raw SQL must quote them exactly or Postgres errors with
  // "column ... does not exist" (42703) and this whole endpoint 500s.
  const counts = await prisma.$queryRaw<{ chatId: string; notification: number }[]>`
    SELECT m."chatId" AS "chatId", COUNT(*)::int AS notification
    FROM messages m
    JOIN chat_users cu
      ON cu."chatId" = m."chatId" AND cu."userId" = ${me}::uuid
    LEFT JOIN chat_reads cr
      ON cr."chatId" = m."chatId" AND cr."userId" = ${me}::uuid
    LEFT JOIN messages last
      ON last.id = cr."lastReadMessageId"
    WHERE m."createdAt" > COALESCE(last."createdAt", '-infinity')
      -- Never count my own messages as unread (I've obviously "read" them).
      -- Without this, a message I just sent is newer than my read pointer and
      -- shows a spurious (1) badge on my own chat after refresh.
      AND m."senderId" <> ${me}::uuid
    GROUP BY m."chatId"
  `;
  const byChat: Record<string, number> = Object.fromEntries(
    counts.map((c) => [c.chatId, c.notification])
  );

  const result = chats
    .map((c) => flattenChat({ ...c, notification: byChat[c.id] ?? 0 }))
    .sort((a, b) => {
      const aTime = a?.latestMessage?.createdAt;
      const bTime = b?.latestMessage?.createdAt;
      if (aTime && bTime) return bTime.getTime() - aTime.getTime();
      if (aTime) return -1;
      if (bTime) return 1;
      return 0;
    });

  res.status(200).json(result);
});

export const createGroupChat = asyncHandler(async (req, res) => {
  const { name, users } = req.body as { name?: string; users?: string[] };
  if (!name || !users) {
    res.status(400).json({ message: "Please fill all the fields" });
    return;
  }

  const memberIds = [...new Set([...users, req.user!.id])];

  const group = await prisma.chat.create({
    data: {
      chatName: name,
      isGroupChat: true,
      groupAdminId: req.user!.id,
      users: { create: memberIds.map((userId) => ({ userId })) },
      reads: { create: memberIds.map((userId) => ({ userId })) },
    },
    include: chatInclude,
  });

  res.status(201).json(flattenChat(group));
});

// Shared admin guard for group mutations. Returns the group, or null after
// having already written an error response.
async function loadGroupAsAdmin(
  groupId: string,
  meId: string,
  res: import("express").Response,
  denyMsg: string
) {
  const group = await prisma.chat.findUnique({
    where: { id: groupId },
    include: { groupAdmin: true, users: true },
  });
  if (!group) {
    res.status(400).json({ message: "Group not found" });
    return null;
  }
  if (group.groupAdminId !== meId) {
    res.status(400).json({ message: denyMsg });
    return null;
  }
  return group;
}

export const renameGroup = asyncHandler(async (req, res) => {
  const { groupId, groupName } = req.body as {
    groupId: string;
    groupName: string;
  };
  const group = await loadGroupAsAdmin(
    groupId,
    req.user!.id,
    res,
    "Name can only be changed by Admin"
  );
  if (!group) return;

  const updated = await prisma.chat.update({
    where: { id: groupId },
    data: { chatName: groupName },
    include: chatInclude,
  });
  res.json(flattenChat(updated));
});

export const removeMember = asyncHandler(async (req, res) => {
  const { groupId, userId } = req.body as { groupId: string; userId: string };
  const group = await loadGroupAsAdmin(
    groupId,
    req.user!.id,
    res,
    "Only Admins can remove participants"
  );
  if (!group) return;

  await prisma.chatUser.deleteMany({ where: { chatId: groupId, userId } });
  await prisma.chatRead.deleteMany({ where: { chatId: groupId, userId } });

  const updated = await prisma.chat.findUnique({
    where: { id: groupId },
    include: chatInclude,
  });
  res.json(flattenChat(updated));
});

export const addMember = asyncHandler(async (req, res) => {
  const { groupId, userId } = req.body as { groupId: string; userId: string };
  const group = await loadGroupAsAdmin(
    groupId,
    req.user!.id,
    res,
    "Only Admins can add participants"
  );
  if (!group) return;

  if (group.users.some((u) => u.userId === userId)) {
    res.status(200).json({ message: "User already added." });
    return;
  }

  await prisma.chatUser.create({ data: { chatId: groupId, userId } });
  await prisma.chatRead.upsert({
    where: { chatId_userId: { chatId: groupId, userId } },
    create: { chatId: groupId, userId },
    update: {},
  });

  const updated = await prisma.chat.findUnique({
    where: { id: groupId },
    include: chatInclude,
  });
  res.json(flattenChat(updated));
});

export const getChatDetails = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!chatId) {
    res.status(400).json({ message: "chatId is required" });
    return;
  }

  if (!(await assertChatMember(chatId, req.user!.id, res))) return;

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: chatInclude,
  });
  res.status(200).json(flattenChat(chat));
});
