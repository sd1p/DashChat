import type { Response } from "express";
import prisma from "../config/prisma";

// Authorization guard for chat-scoped endpoints. isAuthenticated proves *who*
// the requester is; this proves they're actually a member of the chat they're
// acting on. Without it, any authenticated user can read/write any chat by id
// (IDOR). Returns true if the requester is a member; otherwise writes an error
// response and returns false, so callers can `if (!(await assertChatMember(...))) return;`.
export async function assertChatMember(
  chatId: string,
  userId: string,
  res: Response
): Promise<boolean> {
  const membership = await prisma.chatUser.findUnique({
    where: { chatId_userId: { chatId, userId } },
    select: { chatId: true },
  });

  if (!membership) {
    // 404 (not 403) so we don't reveal whether the chat exists to non-members.
    res.status(404).json({ message: "Chat not found" });
    return false;
  }
  return true;
}
