"use client";

import { useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WebRTCCall } from "@/components/chat/useWebRTCCall";

// Full-screen call surface, rendered by ChatHome whenever a call is active.
// Handles all four states: ringing (incoming), calling (outgoing, waiting),
// and connected — plus a permission/error banner.
export default function CallOverlay({ call }: { call: WebRTCCall }) {
  const {
    callState,
    peer,
    withVideo,
    isMuted,
    isCameraOff,
    error,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    dismissError,
  } = call;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach the MediaStreams to the <video> elements imperatively — srcObject
  // isn't a declarative React prop.
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);
  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (callState === "idle") return null;

  const name = peer?.name ?? "Unknown";
  const initial = name[0]?.toUpperCase() ?? "?";
  const statusText =
    callState === "ringing"
      ? withVideo
        ? "Incoming video call…"
        : "Incoming voice call…"
      : callState === "calling"
        ? "Calling…"
        : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-brand-dark text-white">
      {/* Remote video (or avatar for voice / not-yet-connected) */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {withVideo && callState === "connected" ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar className="size-28">
              <AvatarImage src={peer?.photo} alt={name} />
              <AvatarFallback className="bg-brand-sidebar text-3xl text-white">
                {initial}
              </AvatarFallback>
            </Avatar>
            <p className="text-xl font-semibold">{name}</p>
            {statusText && (
              <p className="text-sm text-brand-accent">{statusText}</p>
            )}
          </div>
        )}

        {/* Local self-view PiP — only when we have a video track running. */}
        {withVideo && localStream && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "absolute bottom-4 right-4 h-40 w-28 rounded-lg border border-white/20 object-cover shadow-lg sm:h-48 sm:w-36",
              isCameraOff && "hidden",
            )}
          />
        )}

        {error && (
          <div className="absolute left-1/2 top-6 w-[90%] max-w-md -translate-x-1/2 rounded-md bg-destructive px-4 py-2 text-center text-sm text-white">
            {error}
            <button
              onClick={dismissError}
              className="ml-3 underline underline-offset-2"
            >
              dismiss
            </button>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex shrink-0 items-center justify-center gap-4 bg-black/30 py-6">
        {callState === "ringing" ? (
          <>
            <Button
              onClick={rejectCall}
              size="icon"
              className="size-14 rounded-full bg-destructive hover:bg-destructive/90"
              aria-label="Reject call"
            >
              <PhoneOff className="size-6" />
            </Button>
            <Button
              onClick={acceptCall}
              size="icon"
              className="size-14 rounded-full bg-green-600 hover:bg-green-700"
              aria-label="Accept call"
            >
              <Phone className="size-6" />
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={toggleMute}
              size="icon"
              variant={isMuted ? "secondary" : "ghost"}
              className="size-12 rounded-full text-white hover:bg-white/10 hover:text-white"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </Button>

            {withVideo && (
              <Button
                onClick={toggleCamera}
                size="icon"
                variant={isCameraOff ? "secondary" : "ghost"}
                className="size-12 rounded-full text-white hover:bg-white/10 hover:text-white"
                aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
              >
                {isCameraOff ? (
                  <VideoOff className="size-5" />
                ) : (
                  <Video className="size-5" />
                )}
              </Button>
            )}

            <Button
              onClick={endCall}
              size="icon"
              className="size-14 rounded-full bg-destructive hover:bg-destructive/90"
              aria-label="End call"
            >
              <PhoneOff className="size-6" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
