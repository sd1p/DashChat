"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSocket, CallUser } from "@/socket";

// 1-on-1 WebRTC calling state machine, driven over the existing Socket.IO
// connection (signaling only — media flows peer-to-peer). Mounted once at the
// socket owner (ChatHome) so incoming calls ring regardless of which chat is
// open.
//
//   idle     — no call
//   calling  — we placed a call, waiting for the peer to answer
//   ringing  — an incoming offer is waiting for us to accept/reject
//   connected— peers negotiated; media is (or is about to be) flowing
export type CallState = "idle" | "calling" | "ringing" | "connected";

export interface WebRTCCall {
  callState: CallState;
  peer: CallUser | null;
  withVideo: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  error: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (peer: CallUser, chatId: string, withVideo: boolean) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  dismissError: () => void;
}

interface UseWebRTCCallArgs {
  socket: AppSocket | null;
  selfUser: CallUser | null | undefined;
}

// Free public STUN gets most peers connected. TURN (relay for strict/symmetric
// NATs) is optional config — supply it via env for reliable connectivity over
// the open internet. Only the credentials differ; no code depends on it.
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

export function useWebRTCCall({ socket, selfUser }: UseWebRTCCallArgs): WebRTCCall {
  const [callState, setCallState] = useState<CallState>("idle");
  const [peer, setPeer] = useState<CallUser | null>(null);
  const [withVideo, setWithVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  // The other party's user id — where we send answer/ICE/end signals.
  const peerIdRef = useRef<string | null>(null);
  // A pending inbound offer while we're in the "ringing" state.
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  // ICE candidates that arrive before the remote description is set must be
  // buffered and flushed afterwards, or addIceCandidate throws.
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  // Latest callState, readable inside long-lived socket listeners without
  // re-subscribing (which would tear down mid-call).
  const callStateRef = useRef<CallState>("idle");
  callStateRef.current = callState;

  const teardown = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    peerIdRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setPeer(null);
    setWithVideo(false);
    setIsMuted(false);
    setIsCameraOff(false);
    setCallState("idle");
  }, []);

  // Build a fresh RTCPeerConnection wired to emit ICE + surface remote tracks.
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    pc.onicecandidate = (event) => {
      const toUserId = peerIdRef.current;
      if (event.candidate && toUserId && socket) {
        socket.emit("iceCandidate", {
          toUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0] ?? null);
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        // Peer dropped or the network path died — end locally too.
        if (callStateRef.current !== "idle") teardown();
      }
    };

    return pc;
  }, [socket, teardown]);

  // Acquire local mic/camera, tolerating a camera-less device for video calls.
  const getLocalMedia = useCallback(
    async (video: boolean): Promise<MediaStream> => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    },
    [],
  );

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    for (const c of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        // Ignore individual bad candidates; connectivity survives partial loss.
      }
    }
    pendingCandidatesRef.current = [];
  }, []);

  // --- Outbound call --------------------------------------------------------
  const startCall = useCallback(
    (target: CallUser, chatId: string, video: boolean) => {
      if (!socket || !selfUser) return;
      if (callStateRef.current !== "idle") return; // already busy

      setError(null);
      setPeer(target);
      setWithVideo(video);
      peerIdRef.current = target.id;
      setCallState("calling");

      void (async () => {
        try {
          const stream = await getLocalMedia(video);
          const pc = createPeerConnection();
          pcRef.current = pc;
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("callUser", {
            toUserId: target.id,
            chatId,
            offer,
            from: {
              id: selfUser.id,
              name: selfUser.name,
              photo: selfUser.photo,
            },
            withVideo: video,
          });
        } catch (err) {
          setError(mediaErrorMessage(err));
          if (peerIdRef.current) {
            socket.emit("endCall", { toUserId: peerIdRef.current });
          }
          teardown();
        }
      })();
    },
    [socket, selfUser, getLocalMedia, createPeerConnection, teardown],
  );

  // --- Answer an inbound call ----------------------------------------------
  const acceptCall = useCallback(() => {
    const offer = pendingOfferRef.current;
    const toUserId = peerIdRef.current;
    if (!socket || !offer || !toUserId) return;

    void (async () => {
      try {
        const stream = await getLocalMedia(withVideo);
        const pc = createPeerConnection();
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        await pc.setRemoteDescription(offer);
        await flushPendingCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answerCall", { toUserId, answer });
        pendingOfferRef.current = null;
        setCallState("connected");
      } catch (err) {
        setError(mediaErrorMessage(err));
        socket.emit("rejectCall", { toUserId });
        teardown();
      }
    })();
  }, [
    socket,
    withVideo,
    getLocalMedia,
    createPeerConnection,
    flushPendingCandidates,
    teardown,
  ]);

  const rejectCall = useCallback(() => {
    const toUserId = peerIdRef.current;
    if (socket && toUserId) socket.emit("rejectCall", { toUserId });
    teardown();
  }, [socket, teardown]);

  const endCall = useCallback(() => {
    const toUserId = peerIdRef.current;
    if (socket && toUserId) socket.emit("endCall", { toUserId });
    teardown();
  }, [socket, teardown]);

  // --- Media toggles --------------------------------------------------------
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMuted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setIsMuted(next);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isCameraOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setIsCameraOff(next);
  }, [isCameraOff]);

  const dismissError = useCallback(() => setError(null), []);

  // --- Inbound signaling listeners -----------------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (payload: {
      fromUserId: string;
      chatId: string;
      offer: RTCSessionDescriptionInit;
      from: CallUser;
      withVideo: boolean;
    }) => {
      // Already in a call → auto-reject the newcomer, don't disturb the current.
      if (callStateRef.current !== "idle") {
        socket.emit("rejectCall", { toUserId: payload.fromUserId });
        return;
      }
      peerIdRef.current = payload.fromUserId;
      pendingOfferRef.current = payload.offer;
      setPeer(payload.from);
      setWithVideo(payload.withVideo);
      setError(null);
      setCallState("ringing");
    };

    const handleAnswered = async (payload: { answer: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(payload.answer);
        await flushPendingCandidates();
        setCallState("connected");
      } catch {
        teardown();
      }
    };

    const handleIce = async (payload: { candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      // Buffer until the remote description exists, else addIceCandidate throws.
      if (!pc || !pc.remoteDescription) {
        pendingCandidatesRef.current.push(payload.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(payload.candidate);
      } catch {
        // tolerate individual candidate failures
      }
    };

    const handleRejected = () => teardown();
    const handleEnded = () => teardown();

    socket.on("incomingCall", handleIncoming);
    socket.on("callAnswered", handleAnswered);
    socket.on("iceCandidate", handleIce);
    socket.on("callRejected", handleRejected);
    socket.on("callEnded", handleEnded);

    return () => {
      socket.off("incomingCall", handleIncoming);
      socket.off("callAnswered", handleAnswered);
      socket.off("iceCandidate", handleIce);
      socket.off("callRejected", handleRejected);
      socket.off("callEnded", handleEnded);
    };
  }, [socket, flushPendingCandidates, teardown]);

  // Clean up media/pc if the owner unmounts mid-call.
  useEffect(() => teardown, [teardown]);

  return {
    callState,
    peer,
    withVideo,
    isMuted,
    isCameraOff,
    error,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    dismissError,
  };
}

function mediaErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError")
      return "Camera/microphone permission was denied.";
    if (err.name === "NotFoundError")
      return "No camera or microphone was found.";
    if (err.name === "NotReadableError")
      return "Your camera or microphone is already in use.";
  }
  return "Could not start the call. Please try again.";
}
