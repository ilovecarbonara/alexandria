import { createServiceClient } from "@/lib/supabase/service";
import { Card, StatusChip } from "@/components/ui";

export default async function AdminAlertsPage() {
  const service = createServiceClient();

  const { data: alerts } = await service
    .from("title_alerts")
    .select(
      "id, new_thesis_id, matched_thesis_id, notified_user_id, similarity_score, status, created_at",
    )
    .order("created_at", { ascending: false });

  if (!alerts || alerts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl text-white">Title Alerts</h1>
          <p className="mt-1 font-mono text-sm text-white/40">
            Title similarity alerts log
          </p>
        </div>
        <Card>
          <p className="py-8 text-center font-mono text-sm text-white/40">
            No title alerts recorded yet.
          </p>
        </Card>
      </div>
    );
  }

  // Batch-fetch related theses and users
  const thesisIds = [
    ...new Set([
      ...alerts.map((a) => a.new_thesis_id),
      ...alerts.map((a) => a.matched_thesis_id),
    ]),
  ];
  const userIds = [...new Set(alerts.map((a) => a.notified_user_id))];

  const [thesesRes, usersRes] = await Promise.all([
    service.from("theses").select("id, title").in("id", thesisIds),
    service.from("users").select("id, full_name").in("id", userIds),
  ]);

  const thesisMap = new Map(
    (thesesRes.data ?? []).map((t) => [t.id, t.title]),
  );
  const userMap = new Map(
    (usersRes.data ?? []).map((u) => [u.id, u.full_name]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-white">Title Alerts</h1>
        <p className="mt-1 font-mono text-sm text-white/40">
          Title similarity alerts log — {alerts.length} total
        </p>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                  New Thesis
                </th>
                <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                  Matched Thesis
                </th>
                <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                  Notified User
                </th>
                <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                  Similarity
                </th>
                <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="max-w-48 truncate px-6 py-4 font-mono text-sm text-white/90">
                    {thesisMap.get(alert.new_thesis_id) ?? "Unknown"}
                  </td>
                  <td className="max-w-48 truncate px-6 py-4 font-mono text-sm text-white/90">
                    {thesisMap.get(alert.matched_thesis_id) ?? "Unknown"}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-white/60">
                    {userMap.get(alert.notified_user_id) ?? "Unknown"}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-hash">
                    {(alert.similarity_score * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4">
                    <StatusChip status={alert.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
