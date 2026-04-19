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
      <AlertsTableClient
        alerts={[]}
        title="Title Alerts"
        subtitle="Title similarity alerts log"
        showNotifiedUser
        showExport
      />
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
    <AlertsTableClient
      alerts={enrichedAlerts}
      title="Title Alerts"
      subtitle={`Title similarity alerts log \u2014 ${alerts.length} total`}
      showNotifiedUser
      showExport
    />
  );
}
