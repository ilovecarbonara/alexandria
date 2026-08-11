"use client";

import { useEffect, useState } from "react";
import { getReviewHistory, type ReviewEntry } from "@/lib/actions/reviews";
import { REVIEW_DECISION_LABELS } from "@/lib/constants";
import type { ReviewDecision } from "@/lib/supabase/types";

/** Border colour by outcome: green for progress, red for a stop. */
const DECISION_ACCENT: Record<ReviewDecision, string> = {
  endorsed: "border-success",
  approved: "border-success",
  returned: "border-warning",
  rejected: "border-danger",
};

/**
 * The reviewer's own words, shown to the student.
 *
 * This is the whole point of the returned state — without the comments, a
 * student has no idea what to change.
 */
export function ThesisReviewHistory({ thesisId }: { thesisId: string }) {
  const [entries, setEntries] = useState<ReviewEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getReviewHistory(thesisId)
      .then((result) => {
        if (!active) return;
        if (result.error) setError(result.error);
        else setEntries(result.data ?? []);
      })
      .catch(() => {
        if (active) setError("Could not load the review history.");
      });

    return () => {
      active = false;
    };
  }, [thesisId]);

  if (error) {
    return <p className="text-xs text-danger">{error}</p>;
  }

  if (entries === null) {
    return <p className="text-xs text-ink-subtle">Loading review history…</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-ink-subtle">
        No review decisions yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {entries
        .slice()
        .reverse()
        .map((entry) => (
          <li
            key={entry.id}
            className={`border-l-2 pl-3 ${DECISION_ACCENT[entry.decision]}`}
          >
            <p className="text-xs text-ink">
              {REVIEW_DECISION_LABELS[entry.decision]}
            </p>
            <p className="text-xs text-ink-subtle">
              {entry.reviewerName} ·{" "}
              {entry.reviewerRole === "adviser" ? "Research Adviser" : "Librarian"}{" "}
              · {new Date(entry.createdAt).toLocaleString()}
            </p>
            {entry.comments && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {entry.comments}
              </p>
            )}
          </li>
        ))}
    </ul>
  );
}
