import { createClient } from "@/lib/supabase/server";
import { ThesisRegistryClient } from "@/components/ThesisRegistryClient";

export default async function AdminThesesPage() {
  const supabase = await createClient();

  const { data: theses } = await supabase
    .from("theses")
    .select("id, title, author_name, thesis_level, thesis_category, submission_type, sha256_hash, tx_hash, status, registered_at")
    .order("registered_at", { ascending: false });

  return <ThesisRegistryClient initialTheses={theses ?? []} />;
}
