"use client";

import { useEffect, useRef, useState } from "react";
import {
  Paperclip,
  Image as ImageIcon,
  SendHorizontal,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/queries";
import {
  uploadApi,
  validateImageFile,
  ACCEPTED_IMAGE_TYPES,
  type UploadedAttachment,
} from "@/api";
import type { AppSocket } from "@/socket";

interface InputProps {
  chatId: string;
  socket: AppSocket | null;
  emitNewMessage: (message: import("@/api").Message) => void;
  emitTyping: (chatId: string) => void;
  emitNotTyping: (chatId: string) => void;
}

// A pending image being attached to the next message: it uploads immediately on
// select (upload-then-send), and we hold a local object-URL preview + the S3
// metadata the server needs when the message is finally sent.
interface PendingImage {
  previewUrl: string; // object URL for the thumbnail (revoked on clear)
  progress: number; // 0..1 upload progress
  uploaded: UploadedAttachment | null; // set once the S3 upload completes
  error: string | null;
}

// Ported from _legacy/src/components/Chat/Input.tsx. Sending now goes through
// the useSendMessage mutation (which appends to the open chat + invalidates the
// sidebar list); the socket "newMessage" emit and the typing/notTyping debounce
// are preserved. Image attachments upload on select and ride along on send.
const Input = ({
  chatId,
  socket,
  emitNewMessage,
  emitTyping,
  emitNotTyping,
}: InputProps) => {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<PendingImage | null>(null);
  const typingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useSendMessage();

  // Reset the draft + any pending attachment when switching chats.
  useEffect(() => {
    setMessage("");
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, [chatId]);

  // Revoke the object URL on unmount to avoid a leak.
  useEffect(() => {
    return () => {
      if (pending) URL.revokeObjectURL(pending.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearPending = () => {
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setPending({
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        uploaded: null,
        error: validationError,
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPending({ previewUrl, progress: 0, uploaded: null, error: null });

    try {
      const uploaded = await uploadApi.upload(file, (fraction) => {
        setPending((prev) => (prev ? { ...prev, progress: fraction } : prev));
      });
      setPending((prev) =>
        prev ? { ...prev, uploaded, progress: 1 } : prev,
      );
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Upload failed";
      setPending((prev) => (prev ? { ...prev, error: msg } : prev));
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (!socket?.connected) return;

    if (!typingRef.current) {
      typingRef.current = true;
      emitTyping(chatId);
    }

    const startedAt = Date.now();
    const duration = 3000;
    setTimeout(() => {
      if (Date.now() - startedAt >= duration && typingRef.current) {
        emitNotTyping(chatId);
        typingRef.current = false;
      }
    }, duration);
  };

  // Uploading (has a pending image that hasn't finished) blocks send.
  const isUploading = !!pending && !pending.uploaded && !pending.error;
  const attachment = pending?.uploaded ?? null;
  const canSend =
    !sendMessage.isPending &&
    !isUploading &&
    (!!message.trim() || !!attachment);

  const handleSend = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const content = message.trim();
    // Nothing to send, or an image is still uploading / errored.
    if (!content && !attachment) return;
    if (isUploading) return;

    try {
      const sent = await sendMessage.mutateAsync({
        chatId,
        content,
        ...(attachment ? { attachments: [attachment] } : {}),
      });
      setMessage("");
      clearPending();
      if (socket?.connected) emitNewMessage(sent);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <form
      onSubmit={handleSend}
      className="flex shrink-0 flex-col gap-2 border-t border-black/10 bg-white p-3"
    >
      {/* Pending image preview (thumbnail + progress + remove). */}
      {pending && (
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-2">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pending.previewUrl}
              alt="Attachment preview"
              className="size-full object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="size-5 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {pending.error ? (
              <p className="text-xs text-red-500">{pending.error}</p>
            ) : isUploading ? (
              <>
                <p className="text-xs text-gray-500">
                  Uploading… {Math.round(pending.progress * 100)}%
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#8da4f1] transition-all"
                    style={{ width: `${Math.round(pending.progress * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-green-600">Ready to send</p>
            )}
          </div>

          <button
            type="button"
            onClick={clearPending}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            aria-label="Remove attachment"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-gray-400">
          <input
            ref={fileInputRef}
            type="file"
            id="img"
            className="hidden"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            onChange={handleFileSelect}
          />
          <label
            htmlFor="img"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Attach image"
          >
            <ImageIcon className="size-[18px]" />
          </label>
          <span
            className="flex size-9 cursor-not-allowed items-center justify-center rounded-full opacity-50"
            aria-label="Attach file (coming soon)"
            title="File attachments coming soon"
          >
            <Paperclip className="size-[18px]" />
          </span>
        </div>

        <input
          type="text"
          placeholder="Type a message…"
          value={message}
          onChange={handleTyping}
          className="h-10 min-w-0 flex-1 rounded-full bg-gray-100 px-4 text-sm text-[#2f2d52] outline-none transition-colors placeholder:text-gray-400 focus:bg-gray-50 focus:ring-2 focus:ring-brand-accent/50"
        />

        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          className="size-10 shrink-0 rounded-full bg-[#8da4f1] text-white hover:bg-[#8da4f1]/90"
          aria-label="Send message"
        >
          <SendHorizontal className="size-[18px]" />
        </Button>
      </div>
    </form>
  );
};

export default Input;
