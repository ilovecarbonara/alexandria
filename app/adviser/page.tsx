import { Card } from "@/components/ui";
import { listAdviserQueue } from "@/lib/actions/reviews";
import { AdviserQueueClient } from "./AdviserQueueClient";

export default async function AdviserQueuePage() {
  const { data, error } = await listAdviserQueue();
  const items = data ?? [];

  const needsAttention = items.filter(
    (i) => i.similarityFlagged || i.abstractConfidence === "low",
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-ink">Review Queue</h1>
        <p className="mt-1 text-sm text-ink-subtle">
          Manuscripts awaiting your endorsement before they reach the librarian
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-ink-subtle">Awaiting review</p>
          <p className="mt-2 font-heading text-3xl text-ink">{items.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-ink-subtle">Needs attention</p>
          <p className="mt-2 font-heading text-3xl text-warning">{needsAttention}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-ink-subtle">Resubmissions</p>
          <p className="mt-2 font-heading text-3xl text-ink">
            {items.filter((i) => i.revisionCount > 0).length}
          </p>
        </Card>
      </div>

      <AdviserQueueClient items={items} />
    </div>
  );
}
