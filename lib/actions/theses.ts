"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendStatusChangeEmail } from "@/lib/email";
import { requireAdmin } from "./auth-guards";
import { logActivity } from "./activity";
import { sanitizeSearchTerm } from "@/lib/validation";
import type { ThesisLevel, ThesisStatus, SubmissionType } from "@/lib/supabase/types";

export interface VersionChainEntry {
  id: string;
  title: string;
  submissionType: SubmissionType;
  sha256Hash: string;
  txHash: string;
  blockTimestamp: string;
  registeredAt: string;
}

export interface SearchFilters {
  query?: string;
  level?: ThesisLevel | "";
  category?: string;
  submissionType?: SubmissionType | "";
  dateFrom?: string;
  dateTo?: string;
}

export async function searchTheses(filters: SearchFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("theses")
    .select(
      "id, user_id, title, author_name, thesis_level, thesis_category, submission_type, sha256_hash, tx_hash, status, registered_at",
    )
    .order("registered_at", { ascending: false });

  if (filters.query?.trim()) {
    const term = sanitizeSearchTerm(filters.query);
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,author_name.ilike.%${term}%`,
      );
    }
  }

  if (filters.level) {
    query = query.eq("thesis_level", filters.level);
  }

  if (filters.category) {
    query = query.eq("thesis_category", filters.category);
  }

  if (filters.submissionType) {
    query = query.eq("submission_type", filters.submissionType);
  }

  if (filters.dateFrom) {
    query = query.gte("registered_at", filters.dateFrom);
  }

  if (filters.dateTo) {
    // Add a day to make dateTo inclusive
    const endDate = new Date(filters.dateTo);
    endDate.setDate(endDate.getDate() + 1);
    query = query.lt("registered_at", endDate.toISOString());
  }

  const { data, error } = await query.limit(50);

  if (error) {
    return { error: "Failed to search theses." };
  }

  return { data: data ?? [] };
}

export async function updateThesisStatus(
  thesisId: string,
  status: ThesisStatus,
): Promise<{ error?: string }> {
  if (!thesisId || !status) {
    return { error: "Thesis ID and status are required." };
  }

  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const service = createServiceClient();

  // Fetch thesis with author info for email notification
  const { data: thesis, error: fetchError } = await service
    .from("theses")
    .select("title, tx_hash, user_id")
    .eq("id", thesisId)
    .single();

  if (fetchError || !thesis) {
    return { error: "Thesis not found." };
  }

  const { error } = await service
    .from("theses")
    .update({ status })
    .eq("id", thesisId);

  if (error) return { error: error.message };

  await logActivity(`Thesis status changed to ${status}`);

  // Send email notification on accepted or rejected
  if (status === "accepted" || status === "rejected") {
    const { data: author } = await service
      .from("users")
      .select("email, full_name")
      .eq("id", thesis.user_id)
      .single();

    if (author) {
      await sendStatusChangeEmail({
        recipientEmail: author.email,
        recipientName: author.full_name,
        thesisTitle: thesis.title,
        newStatus: status,
        txHash: thesis.tx_hash,
      }).catch(() => {
        // Email failure is non-blocking
      });
    }
  }

  return {};
}

export async function getUserThesesForLinking(): Promise<{
  error?: string;
  data?: { id: string; title: string; submission_type: string; registered_at: string }[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("theses")
    .select("id, title, submission_type, registered_at")
    .eq("user_id", user.id)
    .order("registered_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getVersionChain(
  thesisId: string,
): Promise<{ error?: string; data?: VersionChainEntry[] }> {
  const supabase = await createClient();

  // Fetch the target thesis to identify the owning user
  const { data: target, error: targetErr } = await supabase
    .from("theses")
    .select("user_id")
    .eq("id", thesisId)
    .single();

  if (targetErr || !target) return { error: "Thesis not found." };

  // Fetch all theses by the same user — chain members always share an owner
  const { data: userTheses, error: fetchErr } = await supabase
    .from("theses")
    .select(
      "id, title, submission_type, sha256_hash, tx_hash, block_timestamp, registered_at, previous_thesis_id",
    )
    .eq("user_id", target.user_id);

  if (fetchErr) return { error: "Failed to load version history." };

  const theses = userTheses ?? [];
  const byId = new Map(theses.map((t) => [t.id, t]));

  // Map each parent → its child for forward traversal
  const childOf = new Map<string, string>();
  for (const t of theses) {
    if (t.previous_thesis_id) {
      childOf.set(t.previous_thesis_id, t.id);
    }
  }

  // Walk backward from thesisId to find the chain root
  let rootId = thesisId;
  const seen = new Set<string>();
  while (true) {
    seen.add(rootId);
    const node = byId.get(rootId);
    if (!node?.previous_thesis_id || seen.has(node.previous_thesis_id)) break;
    rootId = node.previous_thesis_id;
  }

  // Walk forward from root to build the ordered chain
  const chain: VersionChainEntry[] = [];
  let currentId: string | undefined = rootId;
  seen.clear();

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const node = byId.get(currentId);
    if (!node) break;

    chain.push({
      id: node.id,
      title: node.title,
      submissionType: node.submission_type as SubmissionType,
      sha256Hash: node.sha256_hash,
      txHash: node.tx_hash,
      blockTimestamp: node.block_timestamp,
      registeredAt: node.registered_at,
    });

    currentId = childOf.get(currentId);
  }

  return { data: chain };
}
