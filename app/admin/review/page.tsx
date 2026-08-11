import { Card } from "@/components/ui";
import { listLibrarianQueue } from "@/lib/actions/reviews";
import { LibrarianQueueClient } from "./LibrarianQueueClient";

export default async function LibrarianReviewPage() {
  const { data, error } = await listLibrarianQueue();
  const items = data ?? [];

  const flagged = items.filter((i) => i.similarityFlagged).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-ink">Review Queue</h1>
        <p className="mt-1 text-sm text-ink-subtle">
          Adviser-endorsed manuscripts awaiting publication to the public archive
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-ink-subtle">
            Awaiting approval
          </p>
          <p className="mt-2 font-heading text-3xl text-ink">{items.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-ink-subtle">
            Similarity flagged
          </p>
          <p className="mt-2 font-heading text-3xl text-danger">{flagged}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-ink-subtle">
            Abstract needs checking
          </p>
          <p className="mt-2 font-heading text-3xl text-warning">
            {items.filter((i) => i.abstractConfidence === "low").length}
          </p>
        </Card>
      </div>

      <LibrarianQueueClient items={items} />
    </div>
  );
}
