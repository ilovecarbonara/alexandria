"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendStatusChangeEmail } from "@/lib/email";
import { logActivity } from "./activity";
import type { ThesisLevel, ThesisStatus, SubmissionType } from "@/lib/supabase/types";

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
      "id, title, author_name, thesis_level, thesis_category, submission_type, sha256_hash, tx_hash, status, registered_at",
    )
    .order("registered_at", { ascending: false });

  if (filters.query?.trim()) {
    const term = filters.query.trim().replace(/[,()]/g, "");
    query = query.or(
      `title.ilike.%${term}%,author_name.ilike.%${term}%`,
    );
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "Forbidden" };

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
