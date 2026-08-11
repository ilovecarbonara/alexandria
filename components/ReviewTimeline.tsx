import {
  TRACKER_STEPS,
  TRACKER_LABELS,
  trackerState,
} from "@/lib/workflow";
import { STATUS_LABELS } from "@/lib/constants";
import type { ThesisStatus } from "@/lib/supabase/types";

/**
 * Where a submission sits in the pipeline:
 *
 *   Submitted → Adviser Review → Librarian Review → Published
 *
 * A halted state (returned or rejected) marks the step it stopped at, rather
 * than showing the run as complete.
 */
export function ReviewTimeline({
  status,
  className = "",
}: {
  status: ThesisStatus;
  className?: string;
}) {
  // A draft never enters the pipeline, so a tracker would be misleading.
  if (status === "draft") {
    return (
      <p className={`text-xs text-ink-subtle ${className}`}>
        Private draft — not submitted for review.
      </p>
    );
  }

  const { current, halted } = trackerState(status);

  return (
    <div className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {TRACKER_STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;

          const dotClass = halted && active
            ? "bg-danger"
            : done
              ? "bg-success"
              : active
                ? "bg-primary"
                : "bg-raised";

          const textClass = halted && active
            ? "text-danger"
            : done
              ? "text-success"
              : active
                ? "text-primary"
                : "text-ink-subtle";

          return (
            <li key={step} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
              <span className={`text-xs uppercase ${textClass}`}>
                {TRACKER_LABELS[step]}
              </span>
              {index < TRACKER_STEPS.length - 1 && (
                <span
                  className={`ml-1 h-px w-6 ${done ? "bg-success-soft" : "bg-raised"}`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      {halted && (
        <p className="mt-2 text-xs text-danger">
          {status === "returned"
            ? "Returned for revision — see the reviewer's comments below."
            : `${STATUS_LABELS[status]} — this submission will not proceed.`}
        </p>
      )}
    </div>
  );
}
