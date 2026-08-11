import { Card, StatusChip } from "@/components/ui";
import { listAdviserHistory } from "@/lib/actions/reviews";

export default async function AdviserHistoryPage() {
  const { data, error } = await listAdviserHistory();
  const items = (data ?? []).slice().reverse();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-ink">Reviewed</h1>
        <p className="mt-1 text-sm text-ink-subtle">
          Every submission you have acted on, and where it ended up
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Card className="p-0">
        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-subtle">
            You haven&apos;t reviewed any submissions yet.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-3 text-xs uppercase text-ink-subtle">
                  Title
                </th>
                <th className="px-6 py-3 text-xs uppercase text-ink-subtle">
                  Authors
                </th>
                <th className="px-6 py-3 text-xs uppercase text-ink-subtle">
                  Submitted
                </th>
                <th className="px-6 py-3 text-xs uppercase text-ink-subtle">
                  Current status
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="max-w-80 truncate px-6 py-3 text-sm text-ink">
                    {item.title}
                  </td>
                  <td className="max-w-56 truncate px-6 py-3 text-sm text-ink-muted">
                    {item.authors.join(", ")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-sm text-ink-muted">
                    {new Date(item.registeredAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <StatusChip status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
