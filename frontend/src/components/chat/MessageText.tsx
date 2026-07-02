"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";

interface MessageTextProps {
  text: string;
  isOwner?: boolean;
}

// Matches http(s) URLs so we can turn them into clickable links inside the
// message body. The capturing group keeps the delimiters when splitting.
const URL_RE = /(https?:\/\/[^\s<>"')]+)/gi;

// Renders message text with any URLs turned into clickable links.
const MessageText = ({ text, isOwner }: MessageTextProps) => {
  const parts = text.split(URL_RE);
  return (
    <span className="break-words leading-relaxed">
      {parts.map((part, i) => {
        if (URL_RE.test(part)) {
          // Reset lastIndex — test() on a /g regex is stateful.
          URL_RE.lastIndex = 0;
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "underline underline-offset-2",
                isOwner ? "text-white" : "text-[#5d5b8d]",
              )}
            >
              {part}
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </span>
  );
};

export default MessageText;
