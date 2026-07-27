"use client";

import { useEffect, useState } from "react";

// Tracks which users are currently online, from Hermes `presence` events.
//
// Hermes emits `presence` ({ userId, status, at }) to every member of a room
// when someone joins/leaves/disconnects — where `userId` is the Argus subject
// (the token `sub`), i.e. our local User.authId. It also answers a `roster`
// query with the userIds currently in a room, which we use to seed the initial
// online set on join (presence events only cover *changes* after you're there).
//
// Returns a Set of online authIds. Callers map a peer's authId → online.

interface PresenceEvent {
  userId: string;
  status: "online" | "offline";
  at: number;
}

// Minimal structural view of the socket we need — the app's AppSocket adapter
// forwards these native Hermes events verbatim, but doesn't type them.
interface PresenceSocket {
  on(event: "presence", cb: (e: PresenceEvent) => void): void;
  off(event: "presence", cb: (e: PresenceEvent) => void): void;
  emit(
    event: "roster",
    room: string,
    ack: (userIds: string[] | null) => void,
  ): void;
  connected?: boolean;
}

export function usePresence(
  socket: PresenceSocket | null,
  roomId: string | null,
): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Reset when the socket or room changes; the roster below re-seeds it.
    setOnline(new Set());
    if (!socket || !roomId) return;

    const room = `chat:${roomId}`;

    const applyChange = (e: PresenceEvent) => {
      setOnline((prev) => {
        const next = new Set(prev);
        if (e.status === "online") next.add(e.userId);
        else next.delete(e.userId);
        return next;
      });
    };

    socket.on("presence", applyChange);

    // Seed the initial online set with the room's current roster (presence
    // events only cover changes after we're in the room).
    socket.emit("roster", room, (userIds) => {
      if (userIds) setOnline(new Set(userIds));
    });

    return () => {
      socket.off("presence", applyChange);
    };
  }, [socket, roomId]);

  return online;
}
