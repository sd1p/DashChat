import type { Chat, Message, User } from "@prisma/client";

// Socket.IO event contracts — the server side of the same shapes the frontend
// declares in frontend/src/socket.ts.

// A message as broadcast over the socket: the Prisma Message plus the hydrated
// sender and chat (with members) the notify handler needs to route it.
export interface SocketMessage extends Message {
  sender?: User | null;
  chat?: (Chat & { users?: User[] }) | null;
}

// ---- WebRTC calling (1-on-1) -------------------------------------------------
// The backend is a pure signaling relay: it forwards SDP offers/answers and ICE
// candidates between the two peers' user rooms and never inspects the payloads.
// SDP/ICE are DOM lib types on the client; on the server we treat them as opaque
// blobs so we don't need to pull in lib.dom.
type SdpDescription = { type: string; sdp?: string };
type IceCandidate = Record<string, unknown>;

// The minimal caller identity shown in the callee's incoming-call UI.
export interface CallUser {
  id: string;
  name: string;
  photo: string;
}

// Events the client emits to the server.
export interface ClientToServerEvents {
  setup: (userId: string) => void;
  joinChat: (chatId: string) => void;
  newMessage: (message: SocketMessage) => void;
  typing: (room: string) => void;
  notTyping: (room: string) => void;

  // calling
  callUser: (payload: {
    toUserId: string;
    chatId: string;
    offer: SdpDescription;
    from: CallUser;
    withVideo: boolean;
  }) => void;
  answerCall: (payload: { toUserId: string; answer: SdpDescription }) => void;
  iceCandidate: (payload: { toUserId: string; candidate: IceCandidate }) => void;
  rejectCall: (payload: { toUserId: string }) => void;
  endCall: (payload: { toUserId: string }) => void;
}

// Events the server emits to clients.
export interface ServerToClientEvents {
  connected: () => void;
  notify: (message: SocketMessage) => void;
  typing: () => void;
  notTyping: () => void;

  // calling
  incomingCall: (payload: {
    fromUserId: string;
    chatId: string;
    offer: SdpDescription;
    from: CallUser;
    withVideo: boolean;
  }) => void;
  callAnswered: (payload: { answer: SdpDescription }) => void;
  iceCandidate: (payload: { candidate: IceCandidate }) => void;
  callRejected: () => void;
  callEnded: () => void;
}
