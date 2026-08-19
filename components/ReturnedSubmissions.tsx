"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { ReviseSubmission, type RevisableThesis } from "@/components/ReviseSubmission";

/**
 * The returned-for-revision card on the researcher's dashboard.
 *
 * Anything sitting here is blocked on the person reading it, so each entry
 * opens straight into the revision screen with the reviewer's comments — the
 * card used to name the submissions without offering any way to act on them.
 */
export function ReturnedSubmissions({
  theses,
  ownerName,
  noticeAcknowledged,
}: {
  theses: RevisableThesis[];
  ownerName: string;
  /** Whether the researcher has dismissed the publication consent notice. */
  noticeAcknowledged: boolean;
}) {
  const [revising, setRevising] = useState<RevisableThesis | null>(null);

  if (theses.length === 0) return null;

  return (
    <>
      <Card className="border-warning/40 bg-warning-soft">
        <h2 className="font-heading text-lg text-warning">
          {theses.length === 1
            ? "A submission needs your attention"
            : `${theses.length} submissions need your attention`}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          These were returned for revision. Open one to read the reviewer&apos;s
          comments and upload a corrected manuscript.
        </p>
        <ul className="mt-4 space-y-2">
          {theses.map((thesis) => (
            <li key={thesis.id}>
              <button
                type="button"
                onClick={() => setRevising(thesis)}
                className="w-full rounded-md border border-warning/30 bg-surface/60 px-4 py-3 text-left text-sm text-ink transition-colors hover:border-warning hover:bg-surface focus:outline-none focus-visible:ring-1 focus-visible:ring-warning"
              >
                <span className="block truncate">{thesis.title}</span>
                <span className="mt-1 block text-xs text-ink-subtle">
                  Read comments and revise →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {revising && (
        <ReviseSubmission
          thesis={revising}
          ownerName={ownerName}
          noticeAcknowledged={noticeAcknowledged}
          onClose={() => setRevising(null)}
        />
      )}
    </>
  );
}
