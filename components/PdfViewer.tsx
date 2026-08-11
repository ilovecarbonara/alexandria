"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/**
 * The in-page manuscript reader.
 *
 * Frames /api/theses/[id]/pdf, which re-authorizes on every request and streams
 * the bytes rather than handing out a signed Storage URL — so there is no link
 * to forward and no cached copy to leak. Rendering falls to the browser's own
 * PDF viewer, which brings search, zoom, and keyboard navigation for free.
 */
export function PdfViewer({
  thesisId,
  title,
  pageCount,
}: {
  thesisId: string;
  title: string;
  pageCount: number | null;
}) {
  const [open, setOpen] = useState(false);
  const src = `/api/theses/${thesisId}/pdf`;

  return (
    <section className="rounded-lg border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h2 className="font-heading text-lg text-ink">Manuscript</h2>
          <p className="mt-0.5 text-xs text-ink-subtle">
            {pageCount ? `${pageCount} pages · ` : ""}You have full-text access
            to this thesis.
          </p>
        </div>
        <div className="flex gap-2">
          {open && (
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Close reader
            </Button>
          )}
          <a href={src} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">Open in new tab ↗</Button>
          </a>
        </div>
      </div>

      {open ? (
        <div className="p-4">
          <iframe
            src={src}
            title={`Manuscript: ${title}`}
            className="h-[80vh] w-full rounded-md border border-border bg-raised"
          />
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-ink-muted">
            The full manuscript is available to read here.
          </p>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            Read manuscript
          </Button>
        </div>
      )}
    </section>
  );
}
