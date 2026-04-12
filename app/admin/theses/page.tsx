import { createClient } from "@/lib/supabase/server";
import { ThesisRegistryClient } from "@/components/ThesisRegistryClient";

export default async function AdminThesesPage() {
  const supabase = await createClient();

  const { data: theses } = await supabase
    .from("theses")
    .select("id, user_id, title, author_name, thesis_level, thesis_category, submission_type, sha256_hash, tx_hash, status, registered_at, previous_thesis_id")
    .order("registered_at", { ascending: false });

  const rows = theses ?? [];

  // Build email lookup from user_ids
  const userIds = [...new Set(rows.map((t) => t.user_id))];
  const { data: users } = userIds.length
    ? await supabase.from("users").select("id, email").in("id", userIds)
    : { data: [] };
  const emailMap = new Map((users ?? []).map((u) => [u.id, u.email]));

  // Determine which theses participate in a version chain
  const chainParticipants = new Set<string>();
  for (const t of rows) {
    if (t.previous_thesis_id) {
      chainParticipants.add(t.id);
      chainParticipants.add(t.previous_thesis_id);
    }
  }

  const mapped = rows.map((t) => ({
    id: t.id,
    title: t.title,
    author_name: t.author_name,
    thesis_level: t.thesis_level,
    thesis_category: t.thesis_category,
    submission_type: t.submission_type,
    sha256_hash: t.sha256_hash,
    tx_hash: t.tx_hash,
    status: t.status,
    registered_at: t.registered_at,
    user_email: emailMap.get(t.user_id),
  }));

  return (
    <ThesisRegistryClient
      initialTheses={mapped}
      chainParticipantIds={[...chainParticipants]}
    />
  );
}
