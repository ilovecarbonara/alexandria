import { createServiceClient } from "@/lib/supabase/service";
import { DisputeManagementClient } from "@/components/DisputeManagementClient";

export default async function AdminDisputesPage() {
  const service = createServiceClient();

  // Fetch disputes with related thesis title and user name
  const { data: disputes } = await service
    .from("disputes")
    .select("id, reason, status, created_at, thesis_id, flagged_by")
    .order("created_at", { ascending: false });

  if (!disputes || disputes.length === 0) {
    return <DisputeManagementClient initialDisputes={[]} />;
  }

  // Batch-fetch related theses and users
  const thesisIds = [...new Set(disputes.map((d) => d.thesis_id))];
  const userIds = [...new Set(disputes.map((d) => d.flagged_by))];

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

  const enriched = disputes.map((d) => ({
    id: d.id,
    reason: d.reason,
    status: d.status as "open" | "resolved",
    created_at: d.created_at,
    thesis_title: thesisMap.get(d.thesis_id) ?? "Unknown thesis",
    flagged_by_name: userMap.get(d.flagged_by) ?? "Unknown user",
  }));

  return <DisputeManagementClient initialDisputes={enriched} />;
}
