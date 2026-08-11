"use client";

import {
  ReviewQueue,
  LIBRARIAN_DECISIONS,
  type DecisionKind,
} from "@/components/ReviewQueue";
import {
  approveThesis,
  rejectThesis,
  returnThesisFromLibrarian,
  correctAbstract,
} from "@/lib/actions/reviews";
import type { QueueItem } from "@/lib/actions/reviews";

export function LibrarianQueueClient({ items }: { items: QueueItem[] }) {
  async function handleDecision(
    thesisId: string,
    kind: DecisionKind,
    comments: string,
  ) {
    if (kind === "approve") return approveThesis(thesisId, comments || undefined);
    if (kind === "return") return returnThesisFromLibrarian(thesisId, comments);
    if (kind === "reject") return rejectThesis(thesisId, comments);
    return { error: "Unsupported decision." };
  }

  return (
    <ReviewQueue
      items={items}
      decisions={LIBRARIAN_DECISIONS}
      canCorrectAbstract
      emptyMessage="No submissions are waiting for approval."
      onDecision={handleDecision}
      onCorrectAbstract={correctAbstract}
    />
  );
}
