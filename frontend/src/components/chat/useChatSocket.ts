"use client";

import { useEffect, useMemo, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { getSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import type { AppSocket, CallUser } from "@/socket";
import type { Chat, Message } from "@/api";
import { appendMessageToCache, queryKeys } from "@/queries";

// Realtime is served by Hermes, a shared multi-tenant Socket.IO service, rather
// than DashChat's own backend socket. Hermes speaks a small generic protocol
// (join / relay / signal / notify), so this hook wraps a Hermes socket in a
// thin ADAPTER that presents the same event surface the rest of the app already
// uses (`callUser`, `typing`, `notify`, `joinChat`, …). That keeps Chat.tsx,
// Input.tsx and useWebRTCCall.ts unchanged — the protocol translation lives
// here.
//
// Hermes origin + namespace. `${HERMES_URL}/dashchat` is the per-tenant
// namespace; the Argus access token authenticates the handshake (same token the
// REST API uses). Falls back to the legacy NEXT_PUBLIC_SOCKET_URL name if set.
const HERMES_URL =
  process.env.NEXT_PUBLIC_HERMES_URL ?? process.env.NEXT_PUBLIC_SOCKET_URL;
const TENANT_NAMESPACE = "/dashchat";

// Map the app's OUTBOUND call events onto Hermes's single `signal` relay, and
// onto the INBOUND event name the peer listens for. The sender emits e.g.
// "callUser"; the peer listens for "incomingCall" — Hermes relays the `event`
// field verbatim, so we translate the name here at send time. Hermes stamps the
// trustworthy sender as `from`.
const OUTBOUND_TO_INBOUND: Record<string, string> = {
  callUser: "incomingCall",
  answerCall: "callAnswered",
  iceCandidate: "iceCandidate",
  rejectCall: "callRejected",
  endCall: "callEnded",
};
const CALL_EVENTS = new Set(Object.keys(OUTBOUND_TO_INBOUND));

// Chat room name shared with the backend grant + Hermes.
const chatRoom = (chatId: string) => `chat:${chatId}`;

interface UseChatSocketArgs {
  userId: string | undefined;
  selectedChatId: string | null;
}

interface UseChatSocketResult {
  socket: AppSocket | null;
  emitNewMessage: (message: Message) => void;
  emitTyping: (chatId: string) => void;
  emitNotTyping: (chatId: string) => void;
}

/**
 * Wraps a live Hermes socket in an object shaped like the old AppSocket. Only
 * the events DashChat actually uses are translated:
 *
 *   emit("joinChat", chatId)            → join Hermes room "chat:<id>"
 *   emit("typing"/"notTyping", chatId)  → relay to that room
 *   emit(callEvent, { toUserId, ... })  → signal { toUserId, event, data }
 *   on("notify", fn)                    → Hermes "notify" (backend-published)
 *   on("typing"/"notTyping", fn)        → relayed room event
 *   on(callEvent, fn)                   → signal envelope unwrapped to old shape
 *
 * `newMessage` is intentionally a NO-OP: message fan-out is now backend-driven
 * (the server publishes `notify` to Hermes after saving), so the client no
 * longer routes messages itself.
 */
function makeAdapter(hermes: Socket): AppSocket {
  // Track how each app-level listener was registered so .off() can remove the
  // right underlying Hermes listener.
  const wrappers = new Map<
    string,
    Map<(...args: unknown[]) => void, (...args: unknown[]) => void>
  >();

  const remember = (
    event: string,
    orig: (...a: unknown[]) => void,
    wrapped: (...a: unknown[]) => void,
  ) => {
    let m = wrappers.get(event);
    if (!m) {
      m = new Map();
      wrappers.set(event, m);
    }
    m.set(orig, wrapped);
  };

  const adapter = {
    get connected() {
      return hermes.connected;
    },

    emit(event: string, ...args: unknown[]) {
      if (event === "joinChat") {
        const chatId = args[0] as string;
        hermes.emit("join", chatRoom(chatId));
        return adapter;
      }
      if (event === "typing" || event === "notTyping") {
        const chatId = args[0] as string;
        hermes.emit("relay", {
          room: chatRoom(chatId),
          event,
          data: undefined,
        });
        return adapter;
      }
      if (CALL_EVENTS.has(event)) {
        const payload = (args[0] ?? {}) as { toUserId: string } & Record<
          string,
          unknown
        >;
        const { toUserId, ...rest } = payload;
        // Relay under the name the PEER listens for (callUser→incomingCall …).
        hermes.emit("signal", {
          toUserId,
          event: OUTBOUND_TO_INBOUND[event],
          data: rest,
        });
        return adapter;
      }
      // `newMessage` is a no-op (message fan-out is backend-published now).
      if (event === "newMessage") return adapter;
      // Anything else (e.g. `roster`, `peers`, `join` acks) is a native Hermes
      // event — forward verbatim, preserving any ack callback in args.
      hermes.emit(event, ...args);
      return adapter;
    },

    on(event: string, cb: (...args: unknown[]) => void) {
      if (event === "typing" || event === "notTyping") {
        // Relayed room events carry `data` (unused for typing) — call with none.
        const wrapped = () => cb();
        remember(event, cb, wrapped);
        hermes.on(event, wrapped);
        return adapter;
      }
      if (CALL_EVENTS_INBOUND.has(event)) {
        // Hermes delivers signals as { from, fromSocketId, data }. Unwrap to the
        // old flat payloads the WebRTC hook expects.
        const wrapped = (envelope: unknown) => {
          const { from, data } = (envelope ?? {}) as {
            from?: string;
            data?: Record<string, unknown>;
          };
          cb(reshapeInbound(event, from, data ?? {}));
        };
        remember(event, cb, wrapped);
        hermes.on(event, wrapped);
        return adapter;
      }
      // notify, connected, etc. pass straight through.
      hermes.on(event, cb);
      return adapter;
    },

    off(event: string, cb?: (...args: unknown[]) => void) {
      if (!cb) {
        hermes.off(event);
        wrappers.delete(event);
        return adapter;
      }
      const wrapped = wrappers.get(event)?.get(cb);
      hermes.off(event, wrapped ?? cb);
      wrappers.get(event)?.delete(cb);
      return adapter;
    },

    disconnect() {
      hermes.disconnect();
      return adapter;
    },
  };

  return adapter as unknown as AppSocket;
}

// Inbound call events the peer sends us (the names carried inside the signal
// envelope). callUser→incomingCall and answerCall→callAnswered are renamed to
// match the app's inbound event names; the rest keep their name.
const CALL_EVENTS_INBOUND = new Set([
  "incomingCall",
  "callAnswered",
  "iceCandidate",
  "callRejected",
  "callEnded",
]);

// The sender emits `callUser`/`answerCall`; the app listens for
// `incomingCall`/`callAnswered`. Hermes just relays the event name verbatim, so
// the SENDER side maps its outbound name to the inbound name the peer listens
// for. We do that by emitting the inbound name directly (see remap below).
function reshapeInbound(
  event: string,
  from: string | undefined,
  data: Record<string, unknown>,
): unknown {
  switch (event) {
    case "incomingCall":
      // { fromUserId, chatId, offer, from, withVideo }
      return { fromUserId: from, ...data };
    case "callAnswered":
      return { answer: data.answer };
    case "iceCandidate":
      return { candidate: data.candidate };
    case "callRejected":
    case "callEnded":
      return undefined;
    default:
      return data;
  }
}

export function useChatSocket({
  userId,
  selectedChatId,
}: UseChatSocketArgs): UseChatSocketResult {
  const queryClient = useQueryClient();
  const socketRef = useRef<AppSocket | null>(null);

  const selectedChatIdRef = useRef<string | null>(selectedChatId);
  selectedChatIdRef.current = selectedChatId;

  useEffect(() => {
    if (!userId) return;

    // Supply the Argus access token on every (re)connect via the async auth
    // callback so a reconnection after a token refresh sends the fresh token —
    // Hermes verifies it against Argus's JWKS on the handshake.
    const auth = (cb: (data: { token?: string }) => void) => {
      getSession()
        .then((session) => cb({ token: session?.accessToken }))
        .catch(() => cb({}));
    };

    const hermes: Socket = io(`${HERMES_URL}${TENANT_NAMESPACE}`, {
      auth,
      transports: ["websocket"],
    });
    const socket = makeAdapter(hermes);
    socketRef.current = socket;

    // Hermes auto-joins user:<sub> from the verified token, so there's no
    // `setup` step. Incoming message notifications land on "notify".
    socket.on("notify", (incoming: Message) => {
      const openChatId = selectedChatIdRef.current;
      const incomingChatId = incoming.chat?.id;

      if (openChatId && incomingChatId === openChatId) {
        appendMessageToCache(queryClient, openChatId, incoming);
        queryClient.setQueryData<Chat[]>(queryKeys.chats, (prev) =>
          prev?.map((c) =>
            c.id === incomingChatId ? { ...c, notification: 0 } : c,
          ),
        );
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      }
    });

    return () => {
      socket.off("notify");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, queryClient]);

  // Join the Hermes room for the selected chat when it changes. The backend
  // grants access to this room when the messages are loaded (see
  // messageController.getMessages), so the join is authorized by then.
  useEffect(() => {
    const socket = socketRef.current;
    if (socket?.connected && selectedChatId) {
      socket.emit("joinChat", selectedChatId);
    }
  }, [selectedChatId]);

  return useMemo(
    () => ({
      socket: socketRef.current,
      // Message fan-out is backend-published now; the client no longer emits.
      emitNewMessage: (_message: Message) => {},
      emitTyping: (chatId) => socketRef.current?.emit("typing", chatId),
      emitNotTyping: (chatId) => socketRef.current?.emit("notTyping", chatId),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [socketRef.current],
  );
}

// Re-export for callers that type against the caller identity shape.
export type { CallUser };
