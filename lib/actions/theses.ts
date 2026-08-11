"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireLibrarian, requireAuth } from "./auth-guards";
import { sortThesisAuthors } from "@/lib/authors";
import { sanitizeSearchTerm, validateUUID, validateDateRange } from "@/lib/validation";
import { PUBLIC_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { assertTransition } from "@/lib/workflow";
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
  status?: ThesisStatus | "";
  includeAllStatuses?: boolean;
  includeEmail?: boolean;
}

export async function searchTheses(filters: SearchFilters) {
  // Validate date range before querying
  const dateError = validateDateRange(filters.dateFrom, filters.dateTo);
  if (dateError) return { error: dateError };

  // Librarian-only flags require the librarian role
  if (filters.includeAllStatuses || filters.includeEmail) {
    const auth = await requireLibrarian();
    if ("error" in auth) return { error: auth.error };
  }

  const supabase = await createClient();

  let query = supabase
    .from("theses")
    .select(
      "id, user_id, adviser_id, title, abstract, keywords, thesis_level, thesis_category, submission_type, sha256_hash, tx_hash, status, similarity_flagged, registered_at, previous_thesis_id, thesis_authors(name, position)",
    )
    .order("registered_at", { ascending: false });

  // Only published records reach the registry. RLS enforces the same rule at
  // the database, so this is the second of two gates rather than the only one.
  if (!filters.includeAllStatuses) {
    query = query.in("status", PUBLIC_STATUSES);
  }

  // Filter by specific status
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.query?.trim()) {
    const term = sanitizeSearchTerm(filters.query);
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,authors_search.ilike.%${term}%`,
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

  const { data, error } = await query;

  if (error) {
    return { error: "Failed to search theses." };
  }

  const results = (data ?? []).map((thesis) => ({
    ...thesis,
    thesis_authors: sortThesisAuthors(thesis.thesis_authors),
  }));

  // Drafts that already have a child revision. Drafts are never public now, so
  // this only affects the librarian's view — but it still drives the History
  // buttons for both.
  const { data: childLinks } = await supabase
    .from("theses")
    .select("previous_thesis_id")
    .not("previous_thesis_id", "is", null);

  const supersededIds = new Set(
    (childLinks ?? []).map((t) => t.previous_thesis_id).filter((id): id is string => id !== null),
  );

  const filtered = filters.includeAllStatuses
    ? results
    : results.filter(
        (t) => !(t.submission_type === "draft" && supersededIds.has(t.id)),
      );

  // Build chain participant set for History buttons
  const chainParticipantIds: string[] = [];
  const seen = new Set<string>();
  for (const t of filtered) {
    if (t.previous_thesis_id) {
      if (!seen.has(t.id)) { seen.add(t.id); chainParticipantIds.push(t.id); }
      if (!seen.has(t.previous_thesis_id)) { seen.add(t.previous_thesis_id); chainParticipantIds.push(t.previous_thesis_id); }
    }
    if (supersededIds.has(t.id)) {
      if (!seen.has(t.id)) { seen.add(t.id); chainParticipantIds.push(t.id); }
    }
  }

  // Attach user emails when requested (admin only — auth already checked above)
  if (filters.includeEmail) {
    const userIds = [...new Set(filtered.map((t) => t.user_id))];
    const { data: users } = userIds.length
      ? await supabase.from("users").select("id, email").in("id", userIds)
      : { data: [] };
    const emailMap = new Map((users ?? []).map((u: { id: string; email: string }) => [u.id, u.email]));
    const withEmails = filtered.map((t) => ({
      ...t,
      user_email: emailMap.get(t.user_id),
    }));
    return { data: withEmails, chainParticipantIds, supersededIds: [...supersededIds] };
  }

  return { data: filtered, chainParticipantIds, supersededIds: [...supersededIds] };
}

export async function updateThesisStatus(
  thesisId: string,
  status: ThesisStatus,
): Promise<{ error?: string }> {
  if (!thesisId || !status) {
    return { error: "Thesis ID and status are required." };
  }

  if (!validateUUID(thesisId)) {
    return { error: "Invalid thesis ID format." };
  }

  const auth = await requireLibrarian();
  if ("error" in auth) return { error: auth.error };

  const service = createServiceClient();

  // Post-publication status changes only. Moving a submission through review
  // goes via lib/actions/reviews.ts, which records the reviewer's comments.
  const { data: current } = await service
    .from("theses")
    .select("status")
    .eq("id", thesisId)
    .single();

  if (!current) return { error: "Thesis not found." };

  const check = assertTransition(auth.profile.role, current.status, status);
  if (!check.ok) return { error: check.error };

  const { error } = await service
    .from("theses")
    .update({ status })
    .eq("id", thesisId);

  if (error) return { error: error.message };

  await service.from("activity_logs").insert({
    user_id: auth.user.id,
    action: `Thesis status changed to ${STATUS_LABELS[status]}`,
    thesis_id: thesisId,
  });

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

  // Only show drafts — finals aren't valid revision targets
  const { data: drafts, error } = await supabase
    .from("theses")
    .select("id, title, submission_type, registered_at")
    .eq("user_id", user.id)
    .eq("submission_type", "draft")
    .order("registered_at", { ascending: false });

  if (error) return { error: error.message };

  // Exclude drafts that already have a child revision linked to them
  const { data: allTheses } = await supabase
    .from("theses")
    .select("previous_thesis_id")
    .eq("user_id", user.id)
    .not("previous_thesis_id", "is", null);

  const parentIds = new Set(
    (allTheses ?? []).map((t) => t.previous_thesis_id),
  );

  const available = (drafts ?? []).filter((d) => !parentIds.has(d.id));

  return { data: available };
}

export async function getCurrentUserFullName(): Promise<{
  error?: string;
  fullName?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  if (error) return { error: error.message };
  return { fullName: data?.full_name };
}

export async function getVersionChain(
  thesisId: string,
  options?: { includeAllStatuses?: boolean },
): Promise<{ error?: string; data?: VersionChainEntry[] }> {
  if (!validateUUID(thesisId)) {
    return { error: "Invalid thesis ID format." };
  }

  const supabase = await createClient();

  // Fetch the target thesis once to identify the owning user
  const { data: target, error: targetErr } = await supabase
    .from("theses")
    .select("user_id")
    .eq("id", thesisId)
    .single();

  if (targetErr || !target) return { error: "Thesis not found." };

  // Determine whether the caller may see all statuses (including pending).
  // Default is restricted (public-safe); callers must explicitly opt in and
  // the server verifies ownership or admin status before granting access.
  let showAll = false;

  if (options?.includeAllStatuses) {
    const auth = await requireAuth();

    if (!("error" in auth)) {
      if (target.user_id === auth.user.id || auth.profile.role === "librarian") {
        showAll = true;
      }
    }
  }

  // Fetch all theses by the same user — chain members always share an owner
  let thesisQuery = supabase
    .from("theses")
    .select(
      "id, title, submission_type, sha256_hash, tx_hash, block_timestamp, registered_at, previous_thesis_id, status",
    )
    .eq("user_id", target.user_id);

  // Public callers see only the published members of the chain
  if (!showAll) {
    thesisQuery = thesisQuery.in("status", PUBLIC_STATUSES);
  }

  const { data: userTheses, error: fetchErr } = await thesisQuery;

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
