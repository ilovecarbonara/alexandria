import { createClient } from "@/lib/supabase/server";
import { DisputeManagementClient } from "@/components/DisputeManagementClient";

export default async function AdminDisputesPage() {
  const service = await createClient();

  const { data: disputes } = await service
    .from("disputes")
    .select(
      "id, reason, status, created_at, thesis_id, flagged_by, resolution_notes, resolved_by, resolved_at",
    )
    .order("created_at", { ascending: false });

  if (!disputes || disputes.length === 0) {
    return <DisputeManagementClient initialDisputes={[]} />;
  }

  const thesisIds = [...new Set(disputes.map((d) => d.thesis_id))];
  const userIds = [
    ...new Set([
      ...disputes.map((d) => d.flagged_by),
      ...disputes.map((d) => d.resolved_by).filter(Boolean) as string[],
    ]),
  ];

  const [thesesRes, usersRes] = await Promise.all([
    service
      .from("theses")
      .select(
        "id, title, author_name, thesis_level, thesis_category, registered_at, user_id",
      )
      .in("id", thesisIds),
    service.from("users").select("id, full_name").in("id", userIds),
  ]);

  const thesisMap = new Map(
    (thesesRes.data ?? []).map((t) => [t.id, t]),
  );
  const userMap = new Map(
    (usersRes.data ?? []).map((u) => [u.id, u.full_name]),
  );

  // Fetch thesis author names (the user who owns the thesis)
  const thesisAuthorIds = [
    ...new Set(
      (thesesRes.data ?? [])
        .map((t) => t.user_id)
        .filter((uid) => !userMap.has(uid)),
    ),
  ];
  if (thesisAuthorIds.length > 0) {
    const { data: authorUsers } = await service
      .from("users")
      .select("id, full_name")
      .in("id", thesisAuthorIds);
    for (const u of authorUsers ?? []) {
      userMap.set(u.id, u.full_name);
    }
  }

  const enriched = disputes.map((d) => {
    const thesis = thesisMap.get(d.thesis_id);
    return {
      id: d.id,
      reason: d.reason,
      status: d.status as "open" | "resolved",
      created_at: d.created_at,
      thesis_title: thesis?.title ?? "Unknown thesis",
      thesis_author_name: thesis
        ? (userMap.get(thesis.user_id) ?? "Unknown author")
        : "Unknown author",
      thesis_level: thesis?.thesis_level ?? null,
      thesis_category: thesis?.thesis_category ?? null,
      thesis_registered_at: thesis?.registered_at ?? null,
      flagged_by_name: userMap.get(d.flagged_by) ?? "Unknown user",
      resolution_notes: d.resolution_notes,
      resolved_by_name: d.resolved_by
        ? (userMap.get(d.resolved_by) ?? "Unknown admin")
        : null,
      resolved_at: d.resolved_at,
    };
  });

  return <DisputeManagementClient initialDisputes={enriched} />;
}
