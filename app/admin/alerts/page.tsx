import { createClient } from "@/lib/supabase/server";
import { AlertsTableClient } from "@/components/AlertsTableClient";

export default async function AdminAlertsPage() {
  const service = await createClient();

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
        <AlertsTableClient alerts={[]} showNotifiedUser />
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

  const enrichedAlerts = alerts.map((a) => ({
    id: a.id,
    newThesisTitle: thesisMap.get(a.new_thesis_id) ?? "Unknown",
    matchedThesisTitle: thesisMap.get(a.matched_thesis_id) ?? "Unknown",
    notifiedUserName: userMap.get(a.notified_user_id) ?? "Unknown",
    newThesisId: a.new_thesis_id,
    similarityScore: a.similarity_score,
    status: a.status,
    createdAt: a.created_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-white">Title Alerts</h1>
        <p className="mt-1 font-mono text-sm text-white/40">
          Title similarity alerts log — {alerts.length} total
        </p>
      </div>
      <AlertsTableClient alerts={enrichedAlerts} showNotifiedUser />
    </div>
  );
}
