"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Attachment } from "@/api";

interface MessageAttachmentsProps {
  attachments: Attachment[];
  /** Own vs. peer bubble — tunes the card colors to sit on the bubble. */
  isOwner?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Images and GIFs render as an inline preview (click → full-size lightbox);
// every other type (PDF, Excel) renders as a compact download card. Both use
// the attachment's signed S3 URL. `image/*` covers GIFs — animated GIFs play
// inline as-is.
const MessageAttachments = ({
  attachments,
  isOwner,
}: MessageAttachmentsProps) => {
  const [lightbox, setLightbox] = useState<Attachment | null>(null);

  // Drop attachments whose signed URL couldn't be minted (empty url).
  const renderable = attachments.filter((a) => !!a.url);
  if (renderable.length === 0) return null;

  return (
    <>
      <div className="mb-1 flex flex-col gap-1">
        {renderable.map((a) => {
          const isImage = a.mimeType.startsWith("image/");

          if (isImage) {
            const ratio =
              a.width && a.height ? a.width / a.height : undefined;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setLightbox(a)}
                className={cn(
                  "w-72 max-w-full overflow-hidden rounded-md",
                  isOwner ? "bg-white/20" : "bg-gray-100",
                )}
                style={ratio ? { aspectRatio: String(ratio) } : undefined}
                aria-label={`Open image ${a.fileName}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.url}
                  alt={a.fileName}
                  loading="lazy"
                  className="size-full cursor-zoom-in object-cover"
                />
              </button>
            );
          }

          // Non-image → download card.
          return (
            <a
              key={a.id}
              href={a.url}
              download={a.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group flex items-center gap-2 rounded-md p-2 transition-colors",
                isOwner
                  ? "bg-white/15 hover:bg-white/25"
                  : "bg-gray-100 hover:bg-gray-200",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md",
                  isOwner ? "bg-white/20" : "bg-white",
                )}
              >
                <FileText
                  className={cn(
                    "size-5",
                    isOwner ? "text-white" : "text-gray-500",
                  )}
                />
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-xs font-medium",
                    isOwner ? "text-white" : "text-chat-bubble-peer-fg",
                  )}
                >
                  {a.fileName}
                </span>
                <span
                  className={cn(
                    "block text-[10px]",
                    isOwner ? "text-white/70" : "text-gray-400",
                  )}
                >
                  {formatBytes(a.size)}
                </span>
              </span>

              <Download
                className={cn(
                  "size-4 shrink-0 opacity-70 transition-opacity group-hover:opacity-100",
                  isOwner ? "text-white" : "text-gray-500",
                )}
              />
            </a>
          );
        })}
      </div>

      <Dialog
        open={Boolean(lightbox)}
        onOpenChange={(open) => !open && setLightbox(null)}
      >
        {lightbox && (
          <DialogContent className="flex max-h-[90vh] w-fit max-w-[95vw] items-center justify-center border-none bg-transparent p-0 shadow-none sm:max-w-[95vw]">
            <DialogTitle className="sr-only">{lightbox.fileName}</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.fileName}
              className="max-h-[90vh] max-w-full rounded-lg object-contain"
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
};

export default MessageAttachments;
