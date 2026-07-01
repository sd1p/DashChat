"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/api";

interface MessageAttachmentsProps {
  attachments: Attachment[];
  /** Own vs. peer bubble — only used to tune the placeholder background. */
  isOwner?: boolean;
}

// Renders image attachments inline in a message bubble. Clicking one opens a
// full-size lightbox. Width/height (when known) set an aspect-ratio box so the
// bubble doesn't reflow when the signed-URL image finishes loading.
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
      <div
        className={cn(
          "mb-1 grid gap-1",
          renderable.length > 1 ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        {renderable.map((a) => {
          const ratio =
            a.width && a.height ? a.width / a.height : undefined;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setLightbox(a)}
              className={cn(
                "overflow-hidden rounded-md",
                isOwner ? "bg-white/20" : "bg-gray-100",
              )}
              style={
                ratio
                  ? { aspectRatio: String(ratio), maxWidth: "min(20rem, 100%)" }
                  : { maxWidth: "min(20rem, 100%)" }
              }
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
        })}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={() => setLightbox(null)}
            aria-label="Close image"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.fileName}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default MessageAttachments;
