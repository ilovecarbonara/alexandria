"use server";

import { createClient } from "@/lib/supabase/server";
import type { ThesisLevel, SubmissionType } from "@/lib/supabase/types";

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
