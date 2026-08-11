"use client";

import {
  ReviewQueue,
  ADVISER_DECISIONS,
  type DecisionKind,
} from "@/components/ReviewQueue";
import { endorseThesis, returnThesis, correctAbstract } from "@/lib/actions/reviews";
import type { QueueItem } from "@/lib/actions/reviews";

export function AdviserQueueClient({ items }: { items: QueueItem[] }) {
  async function handleDecision(
    thesisId: string,
    kind: DecisionKind,
    comments: string,
  ) {
    if (kind === "endorse") return endorseThesis(thesisId, comments || undefined);
    if (kind === "return") return returnThesis(thesisId, comments);
    return { error: "Unsupported decision." };
  }

  return (
    <ReviewQueue
      items={items}
      decisions={ADVISER_DECISIONS}
      canCorrectAbstract
      emptyMessage="No submissions are waiting for your review."
      onDecision={handleDecision}
      onCorrectAbstract={correctAbstract}
    />
  );
}
