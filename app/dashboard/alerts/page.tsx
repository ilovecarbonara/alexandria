import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AlertsTableClient } from "@/components/AlertsTableClient";

export default async function DashboardAlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: alerts } = await supabase
    .from("title_alerts")
    .select(
      "id, new_thesis_id, matched_thesis_id, similarity_score, status, created_at",
    )
    .eq("notified_user_id", user.id)
    .order("created_at", { ascending: false });

  if (!alerts || alerts.length === 0) {
    return (
      <AlertsTableClient
        alerts={[]}
        title="Title Alerts"
        subtitle="Similarity alerts for your registered theses"
        showDisputeAction
      />
    );
  }

  // Batch-fetch related thesis titles
  const thesisIds = [
    ...new Set([
      ...alerts.map((a) => a.new_thesis_id),
      ...alerts.map((a) => a.matched_thesis_id),
    ]),
  ];

  const { data: theses } = await supabase
    .from("theses")
    .select("id, title")
    .in("id", thesisIds);

  const thesisMap = new Map(
    (theses ?? []).map((t) => [t.id, t.title]),
  );

  const enrichedAlerts = alerts.map((a) => ({
    id: a.id,
    newThesisTitle: thesisMap.get(a.new_thesis_id) ?? "Unknown",
    matchedThesisTitle: thesisMap.get(a.matched_thesis_id) ?? "Unknown",
    newThesisId: a.new_thesis_id,
    similarityScore: a.similarity_score,
    status: a.status,
    createdAt: a.created_at,
  }));

  return (
    <AlertsTableClient
      alerts={enrichedAlerts}
      title="Title Alerts"
      subtitle={`Similarity alerts for your registered theses \u2014 ${alerts.length} total`}
      showDisputeAction
    />
  );
}
