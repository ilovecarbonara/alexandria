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
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl text-white">Title Alerts</h1>
          <p className="mt-1 font-mono text-sm text-white/40">
            Similarity alerts for your registered theses
          </p>
        </div>
        <AlertsTableClient alerts={[]} showDisputeAction />
      </div>
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
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-white">Title Alerts</h1>
        <p className="mt-1 font-mono text-sm text-white/40">
          Similarity alerts for your registered theses — {alerts.length} total
        </p>
      </div>
      <AlertsTableClient alerts={enrichedAlerts} showDisputeAction />
    </div>
  );
}
