import type { Socket } from "socket.io-client";
import type { Message } from "./api";

// Socket.IO event contracts shared by the chat UI. Mirrors the handlers in
// backend/server.ts and the types in backend/types/socket.ts.

// The minimal caller identity shown in the callee's incoming-call UI.
export interface CallUser {
  id: string;
  name: string;
  photo: string;
}

// Events the server emits to this client.
export interface ServerToClientEvents {
  connected: () => void;
  notify: (message: Message) => void;
  typing: () => void;
  notTyping: () => void;

  // calling
  incomingCall: (payload: {
    fromUserId: string;
    chatId: string;
    offer: RTCSessionDescriptionInit;
    from: CallUser;
    withVideo: boolean;
  }) => void;
  callAnswered: (payload: { answer: RTCSessionDescriptionInit }) => void;
  iceCandidate: (payload: { candidate: RTCIceCandidateInit }) => void;
  callRejected: () => void;
  callEnded: () => void;
}

// Events this client emits to the server.
export interface ClientToServerEvents {
  setup: (userId: string) => void;
  joinChat: (chatId: string) => void;
  newMessage: (message: Message) => void;
  typing: (chatId: string) => void;
  notTyping: (chatId: string) => void;

  // calling
  callUser: (payload: {
    toUserId: string;
    chatId: string;
    offer: RTCSessionDescriptionInit;
    from: CallUser;
    withVideo: boolean;
  }) => void;
  answerCall: (payload: { toUserId: string; answer: RTCSessionDescriptionInit }) => void;
  iceCandidate: (payload: { toUserId: string; candidate: RTCIceCandidateInit }) => void;
  rejectCall: (payload: { toUserId: string }) => void;
  endCall: (payload: { toUserId: string }) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
