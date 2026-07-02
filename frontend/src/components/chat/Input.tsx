"use client";

import { useEffect, useRef, useState } from "react";
import {
  Paperclip,
  Image as ImageIcon,
  SendHorizontal,
  X,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/queries";
import {
  uploadApi,
  validateFile,
  ACCEPTED_UPLOAD_ACCEPT,
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

// A pending file being attached to the next message: it uploads immediately on
// select (upload-then-send). We keep a local object-URL thumbnail for images
// (revoked on clear), the file's name/size for the chip, and the S3 metadata
// the server needs when the message is finally sent.
interface PendingFile {
  isImage: boolean;
  previewUrl: string | null; // object URL for image thumbnails only
  fileName: string;
  fileSize: number;
  progress: number; // 0..1 upload progress
  uploaded: UploadedAttachment | null; // set once the S3 upload completes
  error: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Ported from _legacy/src/components/Chat/Input.tsx. Sending now goes through
// the useSendMessage mutation (which appends to the open chat + invalidates the
// sidebar list); the socket "newMessage" emit and the typing/notTyping debounce
// are preserved. File attachments (any type, ≤10 MB) upload on select and ride
// along on send.
const Input = ({
  chatId,
  socket,
  emitNewMessage,
  emitTyping,
  emitNotTyping,
}: InputProps) => {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<PendingFile | null>(null);
  const typingRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useSendMessage();

  // Reset the draft + any pending attachment when switching chats.
  useEffect(() => {
    setMessage("");
    setPending((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, [chatId]);

  // Revoke the object URL on unmount to avoid a leak.
  useEffect(() => {
    return () => {
      if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearPending = () => {
    setPending((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const previewUrl = isImage ? URL.createObjectURL(file) : null;
    const base = {
      isImage,
      previewUrl,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      uploaded: null,
    };

    const validationError = validateFile(file);
    if (validationError) {
      setPending({ ...base, error: validationError });
      return;
    }

    setPending({ ...base, error: null });

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

  // Uploading (has a pending file that hasn't finished) blocks send.
  const isUploading = !!pending && !pending.uploaded && !pending.error;
  const attachment = pending?.uploaded ?? null;
  const canSend =
    !sendMessage.isPending &&
    !isUploading &&
    (!!message.trim() || !!attachment);

  const handleSend = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const content = message.trim();
    // Nothing to send, or a file is still uploading / errored.
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
      className="flex shrink-0 flex-col gap-2 border-t border-black/10 bg-chat-composer p-3"
    >
      {/* Pending attachment strip (thumbnail for images / icon otherwise). */}
      {pending && (
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-2">
          <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-200">
            {pending.isImage && pending.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pending.previewUrl}
                alt="Attachment preview"
                className="size-full object-cover"
              />
            ) : (
              <FileText className="size-7 text-gray-500" />
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="size-5 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-700">
              {pending.fileName}
            </p>
            {pending.error ? (
              <p className="text-xs text-red-500">{pending.error}</p>
            ) : isUploading ? (
              <>
                <p className="text-xs text-gray-500">
                  Uploading… {Math.round(pending.progress * 100)}%
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-chat-bubble-own transition-all"
                    style={{ width: `${Math.round(pending.progress * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-green-600">
                Ready to send · {formatBytes(pending.fileSize)}
              </p>
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
          {/* Image picker (filtered to images). */}
          <input
            ref={imageInputRef}
            type="file"
            id="img"
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />
          <label
            htmlFor="img"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Attach image"
          >
            <ImageIcon className="size-[18px]" />
          </label>

          {/* File picker (images, PDF, Excel). */}
          <input
            ref={fileInputRef}
            type="file"
            id="file"
            className="hidden"
            accept={ACCEPTED_UPLOAD_ACCEPT}
            onChange={handleFileSelect}
          />
          <label
            htmlFor="file"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Attach file"
          >
            <Paperclip className="size-[18px]" />
          </label>
        </div>

        <input
          type="text"
          placeholder="Type a message…"
          value={message}
          onChange={handleTyping}
          className="h-10 min-w-0 flex-1 rounded-full bg-chat-input-field px-4 text-sm text-chat-bubble-peer-fg outline-none transition-colors placeholder:text-gray-400 focus:bg-chat-input-field-focus focus:ring-2 focus:ring-brand-accent/50"
        />

        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          className="size-10 shrink-0 rounded-full bg-chat-bubble-own text-white hover:bg-chat-bubble-own/90"
          aria-label="Send message"
        >
          <SendHorizontal className="size-[18px]" />
        </Button>
      </div>
    </form>
  );
};

export default Input;
