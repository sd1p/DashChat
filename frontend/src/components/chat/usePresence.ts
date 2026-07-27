"use client";

import { useEffect, useRef, useState } from "react";

// Global online presence via Hermes.
//
// A user is "online" whenever they have the site open (>=1 live socket) — no
// shared chat room required. To observe specific users we `watch` their authIds;
// Hermes seeds the current state in the ack and then pushes `user-online` /
// `user-offline` transitions. This is why presence no longer needs the chat to
// be open on both sides, and never requires opening a chat twice.
//
// Pass the authIds you care about:
//   - 1-on-1 chat → the single peer's authId → caller shows "online".
//   - group chat  → every other member's authId → caller shows "(x) online".
//
// Returns the Set of currently-online authIds among the watched ones.

interface UserPresenceEvent {
  userId: string;
  at: number;
}

// Minimal structural view of the socket — the AppSocket adapter forwards these
// native Hermes events/acks verbatim but doesn't type them.
interface PresenceSocket {
  on(
    event: "user-online" | "user-offline",
    cb: (e: UserPresenceEvent) => void,
  ): void;
  off(
    event: "user-online" | "user-offline",
    cb: (e: UserPresenceEvent) => void,
  ): void;
  emit(event: "watch", userId: string, ack: (online: boolean) => void): void;
  emit(event: "unwatch", userId: string): void;
  connected?: boolean;
}

export function usePresence(
  socket: PresenceSocket | null,
  authIds: string[],
): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set());

  // Stable key so the effect only re-runs when the actual set of ids changes,
  // not on every render's new array identity.
  const key = [...authIds].sort().join(",");
  const idsRef = useRef<string[]>(authIds);
  idsRef.current = authIds;

  useEffect(() => {
    setOnline(new Set());
    if (!socket) return;
    const ids = idsRef.current.filter(Boolean);
    if (ids.length === 0) return;

    const watched = new Set(ids);

    const onOnline = (e: UserPresenceEvent) => {
      if (!watched.has(e.userId)) return;
      setOnline((prev) => new Set(prev).add(e.userId));
    };
    const onOffline = (e: UserPresenceEvent) => {
      if (!watched.has(e.userId)) return;
      setOnline((prev) => {
        const next = new Set(prev);
        next.delete(e.userId);
        return next;
      });
    };

    socket.on("user-online", onOnline);
    socket.on("user-offline", onOffline);

    // Watch each id; the ack seeds its current online state (no race — Hermes
    // answers with the live socket count at subscribe time).
    for (const id of ids) {
      socket.emit("watch", id, (isOnline: boolean) => {
        if (isOnline) setOnline((prev) => new Set(prev).add(id));
      });
    }

    return () => {
      socket.off("user-online", onOnline);
      socket.off("user-offline", onOffline);
      for (const id of ids) socket.emit("unwatch", id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, key]);

  return online;
}
