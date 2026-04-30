import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DisputeManagementClient,
  type AdminDisputeRow,
} from "@/components/DisputeManagementClient";
import type { DisputeAuthorRole } from "@/lib/supabase/types";

const PREVIEW_LENGTH = 140;

function truncatePreview(body: string): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  return collapsed.length > PREVIEW_LENGTH
    ? collapsed.slice(0, PREVIEW_LENGTH) + "…"
    : collapsed;
}

export default async function AdminDisputesPage() {
  const service = await createClient();

  const {
    data: { user },
  } = await service.auth.getUser();
  if (!user) redirect("/login");

  const { data: disputes } = await service
    .from("disputes")
    .select(
      "id, status, created_at, thesis_id, flagged_by, resolved_by, resolved_at",
    )
    .order("created_at", { ascending: false });

  if (!disputes || disputes.length === 0) {
    return <DisputeManagementClient initialDisputes={[]} />;
  }

  const disputeIds = disputes.map((d) => d.id);
  const thesisIds = [...new Set(disputes.map((d) => d.thesis_id))];
  const userIds = [
    ...new Set([
      ...disputes.map((d) => d.flagged_by),
      ...(disputes.map((d) => d.resolved_by).filter(Boolean) as string[]),
    ]),
  ];

  const [thesesRes, usersRes, messagesRes, readsRes] = await Promise.all([
    service
      .from("theses")
      .select(
        "id, title, author_name, thesis_level, thesis_category, registered_at, user_id",
      )
      .in("id", thesisIds),
    service.from("users").select("id, full_name").in("id", userIds),
    service
      .from("dispute_messages")
      .select("dispute_id, author_id, author_role, body, created_at")
      .in("dispute_id", disputeIds)
      .order("created_at", { ascending: true }),
    service
      .from("dispute_reads")
      .select("dispute_id, last_read_at")
      .eq("user_id", user.id)
      .in("dispute_id", disputeIds),
  ]);

  const thesisMap = new Map((thesesRes.data ?? []).map((t) => [t.id, t]));
  const userMap = new Map(
    (usersRes.data ?? []).map((u) => [u.id, u.full_name]),
  );

  // Backfill thesis-author names not already in userMap.
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
    for (const u of authorUsers ?? []) userMap.set(u.id, u.full_name);
  }

  type Msg = {
    author_id: string;
    author_role: DisputeAuthorRole;
    body: string;
    created_at: string;
  };
  const messagesByDispute = new Map<string, Msg[]>();
  for (const m of messagesRes.data ?? []) {
    const arr = messagesByDispute.get(m.dispute_id) ?? [];
    arr.push(m);
    messagesByDispute.set(m.dispute_id, arr);
  }

  const readMap = new Map(
    (readsRes.data ?? []).map(
      (r) => [r.dispute_id, r.last_read_at] as const,
    ),
  );

  const enriched: AdminDisputeRow[] = disputes.map((d) => {
    const thesis = thesisMap.get(d.thesis_id);
    const msgs = messagesByDispute.get(d.id) ?? [];
    const opening = msgs[0]?.body ?? "";
    const last = msgs[msgs.length - 1];
    const closing =
      d.status === "resolved"
        ? ([...msgs].reverse().find((m) => m.author_role === "admin")?.body ??
          null)
        : null;
    const lastRead = readMap.get(d.id);
    const unread = msgs.filter(
      (m) =>
        m.author_id !== user.id &&
        (!lastRead || m.created_at > lastRead),
    ).length;

    return {
      id: d.id,
      status: d.status as "open" | "resolved",
      created_at: d.created_at,
      thesis_id: d.thesis_id,
      thesis_title: thesis?.title ?? "Unknown thesis",
      thesis_author_name: thesis
        ? (userMap.get(thesis.user_id) ?? "Unknown author")
        : "Unknown author",
      thesis_level: thesis?.thesis_level ?? null,
      thesis_category: thesis?.thesis_category ?? null,
      thesis_registered_at: thesis?.registered_at ?? null,
      flagged_by_name: userMap.get(d.flagged_by) ?? "Unknown user",
      resolved_by_name: d.resolved_by
        ? (userMap.get(d.resolved_by) ?? "Unknown admin")
        : null,
      resolved_at: d.resolved_at,
      opening_message: opening,
      closing_note: closing,
      last_message_at: last?.created_at ?? null,
      last_message_preview: last ? truncatePreview(last.body) : null,
      last_message_role: last?.author_role ?? null,
      unread_count: unread,
    };
  });

  // Surface most recently active threads first.
  enriched.sort((a, b) => {
    const av = a.last_message_at ?? a.created_at;
    const bv = b.last_message_at ?? b.created_at;
    return bv.localeCompare(av);
  });

  return <DisputeManagementClient initialDisputes={enriched} />;
}
