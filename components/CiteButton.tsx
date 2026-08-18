"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Button, Modal } from "@/components/ui";
import {
  formatAllCitations,
  CITATION_STYLES,
  type Citation,
  type CitationStyle,
} from "@/lib/citation";
import type { ThesisLevel } from "@/lib/supabase/types";

interface CiteButtonProps {
  title: string;
  /** Author names in credited order. */
  authors: string[];
  year: number;
  level: ThesisLevel;
  /** Root-relative path to this record, e.g. `/thesis/{id}`. */
  path: string;
  className?: string;
}

/**
 * Resolves the origin a citation should point at.
 *
 * `NEXT_PUBLIC_APP_URL` is `http://localhost:3000` in `.env.example`, so
 * trusting it outright would put localhost in a citation on any deployment
 * that never overrode it. The browser's own origin is always the address the
 * reader is actually on, so the configured value only wins when it is set to
 * something that is not a loopback host.
 */
function resolveOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(configured)) {
    return configured.replace(/\/+$/, "");
  }
  return window.location.origin;
}

/** The origin never changes for the life of the document, so nothing to watch. */
const subscribeToNothing = () => () => {};

/**
 * The server has no origin to report, so it renders a relative URL and React
 * swaps in the absolute one right after hydration. Reading it this way rather
 * than from an effect keeps the two passes agreeing on what was sent.
 */
function useOrigin(): string {
  return useSyncExternalStore(subscribeToNothing, resolveOrigin, () => "");
}

export function CiteButton({
  title,
  authors,
  year,
  level,
  path,
  className,
}: CiteButtonProps) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CitationStyle>("apa");
  const [copied, setCopied] = useState(false);

  const origin = useOrigin();

  const citations = useMemo(
    () => formatAllCitations({ title, authors, year, level, url: `${origin}${path}` }),
    [title, authors, year, level, origin, path],
  );

  const active = citations.find((c) => c.style === style) ?? citations[0];

  // A copied notice belongs to one citation, so every action that changes which
  // one is on screen retires it.
  function selectStyle(next: CitationStyle) {
    setStyle(next);
    setCopied(false);
  }

  function setDialogOpen(next: boolean) {
    setOpen(next);
    setCopied(false);
  }

  async function handleCopy(citation: Citation) {
    // The rich flavour is what preserves the italicised title in a paste into
    // Word or Google Docs. Anything that rejects it still gets plain text.
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([citation.text], { type: "text/plain" }),
            "text/html": new Blob([citation.html], { type: "text/html" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(citation.text);
      }
      setCopied(true);
    } catch {
      try {
        await navigator.clipboard.writeText(citation.text);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setDialogOpen(true)}
        className={className}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3" />
          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3" />
        </svg>
        Cite
      </Button>

      <Modal
        open={open}
        onClose={() => setDialogOpen(false)}
        title="Cite this thesis"
        className="w-140 max-w-[92vw]"
      >
        <div
          role="tablist"
          aria-label="Citation style"
          className="flex gap-1 rounded-md bg-raised p-1"
        >
          {CITATION_STYLES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={option.id === active.style}
              onClick={() => selectStyle(option.id)}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                option.id === active.style
                  ? "bg-surface text-ink shadow-card"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Hanging indent, the way the entry will sit in a reference list. */}
        <p
          className="mt-4 -indent-6 rounded-md border border-border bg-page py-3 pl-9 pr-4 text-sm leading-relaxed text-ink wrap-break-word"
          dangerouslySetInnerHTML={{ __html: active.html }}
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-subtle">
            Check the entry against your department&apos;s style guide before
            submitting it.
          </p>
          <Button onClick={() => handleCopy(active)} className="shrink-0">
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
