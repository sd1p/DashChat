"use client";

import { cn } from "@/lib/utils";
import type { LinkPreview } from "@/api";

interface LinkPreviewCardProps {
  preview: LinkPreview;
  /** Own vs. peer bubble — tunes the card background to sit on the bubble. */
  isOwner?: boolean;
}

// A compact Open Graph card rendered under a message whose text contained a
// link. The og:image is hotlinked directly. Clicking opens the URL in a new tab.
const LinkPreviewCard = ({ preview, isOwner }: LinkPreviewCardProps) => {
  const host = (() => {
    try {
      return new URL(preview.url).hostname.replace(/^www\./, "");
    } catch {
      return preview.siteName ?? preview.url;
    }
  })();

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-1 block w-72 max-w-full overflow-hidden rounded-md transition-colors",
        isOwner ? "bg-white/15 hover:bg-white/25" : "bg-gray-100 hover:bg-gray-200",
      )}
    >
      {preview.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.imageUrl}
          alt={preview.title ?? host}
          loading="lazy"
          className="h-32 w-full object-cover"
          // Hide the image slot entirely if the remote og:image fails to load.
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="p-2">
        <p
          className={cn(
            "text-[10px] uppercase tracking-wide",
            isOwner ? "text-white/60" : "text-gray-400",
          )}
        >
          {preview.siteName ?? host}
        </p>
        {preview.title && (
          <p
            className={cn(
              "line-clamp-2 text-xs font-semibold",
              isOwner ? "text-white" : "text-[#2f2d52]",
            )}
          >
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p
            className={cn(
              "mt-0.5 line-clamp-2 text-[11px]",
              isOwner ? "text-white/80" : "text-gray-500",
            )}
          >
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
};

export default LinkPreviewCard;
