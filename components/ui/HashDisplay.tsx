"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

interface HashDisplayProps {
  hash: string;
  className?: string;
  copyable?: boolean;
}

async function copyToClipboard(text: string) {
  const clipboard = navigator.clipboard;

  if (clipboard?.writeText) {
    await clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const copied = document.execCommand("copy");
    if (!copied) {
      throw new Error("Unable to copy hash");
    }
  } finally {
    document.body.removeChild(textArea);
  }
}

export function HashDisplay({
  hash,
  className = "",
  copyable = false,
}: HashDisplayProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const truncated = hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : hash;

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function handleCopy(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    try {
      await copyToClipboard(hash);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }

    resetTimerRef.current = setTimeout(() => {
      setCopyState("idle");
      resetTimerRef.current = null;
    }, 1600);
  }

  if (copyable) {
    const isCopied = copyState === "copied";
    const isError = copyState === "error";

    return (
      <button
        type="button"
        className={`inline-flex cursor-copy items-center gap-1.5 whitespace-nowrap rounded-xs font-mono transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
          isCopied
            ? "text-success"
            : isError
              ? "text-dispute"
              : "text-hash hover:text-accent"
        } ${className}`}
        title={
          isCopied
            ? "Copied full hash"
            : isError
              ? "Unable to copy hash"
              : `Copy full hash: ${hash}`
        }
        aria-label="Copy full hash"
        onClick={handleCopy}
      >
        {isCopied ? (
          <>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied
          </>
        ) : isError ? (
          "Failed"
        ) : (
          truncated
        )}
        <span className="sr-only" aria-live="polite">
          {isCopied ? "Copied full hash" : isError ? "Failed to copy hash" : ""}
        </span>
      </button>
    );
  }

  return (
    <span
      className={`whitespace-nowrap font-mono text-hash ${className}`}
      title={hash}
    >
      {truncated}
    </span>
  );
}
