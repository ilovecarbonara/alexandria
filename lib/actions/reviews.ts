"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  requireAdviser,
  requireLibrarian,
  requireReviewer,
} from "./auth-guards";
import { sortThesisAuthors } from "@/lib/authors";
import { sanitizeTextInput, validateUUID } from "@/lib/validation";
import { MAX_REVIEW_COMMENTS_LENGTH, STATUS_LABELS } from "@/lib/constants";
import {
  DECISION_REQUIRES_COMMENTS,
  DECISION_TARGET,
  assertTransition,
  reviewerRoleFor,
} from "@/lib/workflow";
import { rateLimit } from "@/lib/rate-limit";
import type {
  AbstractConfidence,
  ReviewDecision,
  ReviewerRole,
  ThesisStatus,
  UserRole,
} from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface QueueItem {
  id: string;
  title: string;
  abstract: string | null;
  abstractConfidence: AbstractConfidence | null;
  thesisLevel: string;
  thesisCategory: string;
  status: ThesisStatus;
  similarityFlagged: boolean;
  revisionCount: number;
  registeredAt: string;
  authors: string[];
  submitterName: string;
  adviserName: string | null;
}

export interface ReviewEntry {
  id: string;
  reviewerName: string;
  reviewerRole: ReviewerRole;
  decision: ReviewDecision;
  comments: string | null;
  revisionNumber: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Queues
// ---------------------------------------------------------------------------

const QUEUE_COLUMNS =
  "id, user_id, adviser_id, title, abstract, abstract_confidence, thesis_level, thesis_category, status, similarity_flagged, revision_count, registered_at, thesis_authors(name, position)";

type QueueFilter = {
  adviserId?: string;
  /** Exactly this status. */
  status?: ThesisStatus;
  /** Anything but this status. */
  notStatus?: ThesisStatus;
};

/**
 * Loads submissions for a review queue, joined with the names needed to render
 * it. Uses the service client because a reviewer must see the submitter's name,
 * which RLS on `users` would otherwise hide; the caller has already been
 * authorized by role.
 */
async function loadQueue(filter: QueueFilter): Promise<QueueItem[]> {
  const service = createServiceClient();

  let query = service
    .from("theses")
    .select(QUEUE_COLUMNS)
    .order("registered_at", { ascending: true });

  if (filter.adviserId) query = query.eq("adviser_id", filter.adviserId);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.notStatus) query = query.neq("status", filter.notStatus);

  const { data, error } = await query;

  if (error || !data) return [];

  const userIds = [
    ...new Set(
      data.flatMap((t) =>
        [t.user_id, t.adviser_id].filter((id): id is string => !!id),
      ),
    ),
  ];

  const { data: users } = userIds.length
    ? await service.from("users").select("id, full_name").in("id", userIds)
    : { data: [] };

  const nameMap = new Map((users ?? []).map((u) => [u.id, u.full_name] as const));

  return data.map((t) => ({
    id: t.id,
    title: t.title,
    abstract: t.abstract,
    abstractConfidence: t.abstract_confidence,
    thesisLevel: t.thesis_level,
    thesisCategory: t.thesis_category,
    status: t.status,
    similarityFlagged: t.similarity_flagged,
    revisionCount: t.revision_count,
    registeredAt: t.registered_at,
    authors: sortThesisAuthors(t.thesis_authors).map((a) => a.name),
    submitterName: nameMap.get(t.user_id) ?? "Unknown",
    adviserName: t.adviser_id ? (nameMap.get(t.adviser_id) ?? "Unknown") : null,
  }));
}

/** Submissions waiting on the signed-in adviser. */
export async function listAdviserQueue(): Promise<{
  error?: string;
  data?: QueueItem[];
}> {
  const auth = await requireAdviser();
  if ("error" in auth) return { error: auth.error };

  return {
    data: await loadQueue({
      adviserId: auth.user.id,
      status: "pending_adviser",
    }),
  };
}

/** Everything the signed-in adviser has already acted on. */
export async function listAdviserHistory(): Promise<{
  error?: string;
  data?: QueueItem[];
}> {
  const auth = await requireAdviser();
  if ("error" in auth) return { error: auth.error };

  return {
    data: await loadQueue({
      adviserId: auth.user.id,
      notStatus: "pending_adviser",
    }),
  };
}

/** Submissions endorsed by an adviser and waiting on the librarian. */
export async function listLibrarianQueue(): Promise<{
  error?: string;
  data?: QueueItem[];
}> {
  const auth = await requireLibrarian();
  if ("error" in auth) return { error: auth.error };

  return { data: await loadQueue({ status: "pending_librarian" }) };
}

export async function countAdviserQueue(): Promise<number> {
  const auth = await requireAdviser();
  if ("error" in auth) return 0;

  const service = createServiceClient();
  const { count } = await service
    .from("theses")
    .select("id", { count: "exact", head: true })
    .eq("adviser_id", auth.user.id)
    .eq("status", "pending_adviser");

  return count ?? 0;
}

export async function countLibrarianQueue(): Promise<number> {
  const auth = await requireLibrarian();
  if ("error" in auth) return 0;

  const service = createServiceClient();
  const { count } = await service
    .from("theses")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_librarian");

  return count ?? 0;
}

/** The ordered decision trail. Readable by every stakeholder of the thesis. */
export async function getReviewHistory(
  thesisId: string,
): Promise<{ error?: string; data?: ReviewEntry[] }> {
  if (!validateUUID(thesisId)) return { error: "Invalid thesis ID format." };

  // RLS limits this to stakeholders, so no extra authorization is needed here.
  const client = await createClient();
  const { data, error } = await client
    .from("thesis_reviews")
    .select("id, reviewer_id, reviewer_role, decision, comments, revision_number, created_at")
    .eq("thesis_id", thesisId)
    .order("created_at", { ascending: true });

  if (error) return { error: "Failed to load review history." };

  const service = createServiceClient();
  const reviewerIds = [...new Set((data ?? []).map((r) => r.reviewer_id))];
  const { data: users } = reviewerIds.length
    ? await service.from("users").select("id, full_name").in("id", reviewerIds)
    : { data: [] };
  const nameMap = new Map((users ?? []).map((u) => [u.id, u.full_name] as const));

  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      reviewerName: nameMap.get(r.reviewer_id) ?? "Unknown",
      reviewerRole: r.reviewer_role,
      decision: r.decision,
      comments: r.comments,
      revisionNumber: r.revision_number,
      createdAt: r.created_at,
    })),
  };
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

/**
 * The one path a submission takes through the pipeline.
 *
 * Validates the transition, records the decision with its comments, advances
 * the status, and notifies the submitter. Nothing else writes `theses.status`
 * during review.
 */
async function submitDecision(
  thesisId: string,
  decision: ReviewDecision,
  rawComments: string | undefined,
  actorRole: UserRole,
): Promise<{ error?: string }> {
  if (!validateUUID(thesisId)) return { error: "Invalid thesis ID format." };

  const auth =
    actorRole === "adviser" ? await requireAdviser() : await requireLibrarian();
  if ("error" in auth) return { error: auth.error };

  const reviewerRole = reviewerRoleFor(auth.profile.role);
  if (!reviewerRole) return { error: "Forbidden" };

  // 60 decisions per hour is far above real reviewing pace but bounds a
  // runaway client.
  const rl = await rateLimit(`review:${auth.user.id}`, {
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.success) {
    return { error: "Too many review actions. Please try again shortly." };
  }

  const comments = rawComments ? sanitizeTextInput(rawComments) : "";

  if (DECISION_REQUIRES_COMMENTS[decision] && !comments) {
    return {
      error:
        decision === "returned"
          ? "Explain what the student needs to change before resubmitting."
          : "A rejection must include a reason.",
    };
  }

  if (comments.length > MAX_REVIEW_COMMENTS_LENGTH) {
    return {
      error: `Comments must be ${MAX_REVIEW_COMMENTS_LENGTH} characters or less.`,
    };
  }

  const service = createServiceClient();

  const { data: thesis } = await service
    .from("theses")
    .select("id, user_id, adviser_id, status, revision_count, title")
    .eq("id", thesisId)
    .single();

  if (!thesis) return { error: "Submission not found." };

  // An adviser may only act on submissions assigned to them.
  if (reviewerRole === "adviser" && thesis.adviser_id !== auth.user.id) {
    return { error: "You are not the assigned adviser for this submission." };
  }

  const target = DECISION_TARGET[decision];
  const check = assertTransition(auth.profile.role, thesis.status, target);
  if (!check.ok) return { error: check.error };

  const { error: reviewError } = await service.from("thesis_reviews").insert({
    thesis_id: thesisId,
    reviewer_id: auth.user.id,
    reviewer_role: reviewerRole,
    decision,
    comments: comments || null,
    revision_number: thesis.revision_count,
  });

  if (reviewError) return { error: reviewError.message };

  const update: {
    status: ThesisStatus;
    adviser_reviewed_at?: string;
    librarian_reviewed_at?: string;
  } = { status: target };

  const now = new Date().toISOString();
  if (reviewerRole === "adviser") update.adviser_reviewed_at = now;
  else update.librarian_reviewed_at = now;

  const { error: updateError } = await service
    .from("theses")
    .update(update)
    .eq("id", thesisId)
    // Guard against two reviewers acting on the same submission concurrently.
    .eq("status", thesis.status);

  if (updateError) return { error: updateError.message };

  // Log for the reviewer's own trail and, separately, for the submitter's feed.
  await service.from("activity_logs").insert([
    {
      user_id: auth.user.id,
      action: `${reviewerRole === "adviser" ? "Adviser" : "Librarian"} decision: ${decision}`,
      thesis_id: thesisId,
    },
    {
      user_id: thesis.user_id,
      action: `Your submission is now ${STATUS_LABELS[target].toLowerCase()}`,
      thesis_id: thesisId,
    },
  ]);

  return {};
}

/** Adviser: pass the submission up to the librarian. */
export async function endorseThesis(
  thesisId: string,
  comments?: string,
): Promise<{ error?: string }> {
  return submitDecision(thesisId, "endorsed", comments, "adviser");
}

/** Adviser: send it back to the student with required comments. */
export async function returnThesis(
  thesisId: string,
  comments: string,
): Promise<{ error?: string }> {
  return submitDecision(thesisId, "returned", comments, "adviser");
}

/** Librarian: publish it to the registry. */
export async function approveThesis(
  thesisId: string,
  comments?: string,
): Promise<{ error?: string }> {
  return submitDecision(thesisId, "approved", comments, "librarian");
}

/** Librarian: reject with a required reason. Terminal. */
export async function rejectThesis(
  thesisId: string,
  comments: string,
): Promise<{ error?: string }> {
  return submitDecision(thesisId, "rejected", comments, "librarian");
}

/** Librarian: bounce it back past the adviser to the student. */
export async function returnThesisFromLibrarian(
  thesisId: string,
  comments: string,
): Promise<{ error?: string }> {
  return submitDecision(thesisId, "returned", comments, "librarian");
}

// ---------------------------------------------------------------------------
// Abstract correction
// ---------------------------------------------------------------------------

/**
 * The escape hatch for a PDF whose abstract the extractor read badly.
 *
 * Only a reviewer can do this — never the submitter — so an abstract is still
 * never authored by the person whose work it describes.
 */
export async function correctAbstract(
  thesisId: string,
  abstract: string,
): Promise<{ error?: string }> {
  if (!validateUUID(thesisId)) return { error: "Invalid thesis ID format." };

  const auth = await requireReviewer();
  if ("error" in auth) return { error: auth.error };

  const clean = sanitizeTextInput(abstract);
  if (!clean) return { error: "The abstract cannot be empty." };
  if (clean.length < 100) {
    return { error: "That looks too short to be an abstract." };
  }
  if (clean.length > 8000) {
    return { error: "The abstract must be 8000 characters or less." };
  }

  const service = createServiceClient();

  const { data: thesis } = await service
    .from("theses")
    .select("id, adviser_id, status")
    .eq("id", thesisId)
    .single();

  if (!thesis) return { error: "Submission not found." };

  if (auth.profile.role === "adviser") {
    if (thesis.adviser_id !== auth.user.id) {
      return { error: "You are not the assigned adviser for this submission." };
    }
    // An adviser's window is the review itself; afterwards it is the
    // librarian's record to maintain.
    if (thesis.status !== "pending_adviser") {
      return { error: "This submission is no longer awaiting your review." };
    }
  }

  const { error } = await service
    .from("theses")
    .update({
      abstract: clean,
      abstract_confidence: "high",
      abstract_corrected_by: auth.user.id,
      abstract_corrected_at: new Date().toISOString(),
    })
    .eq("id", thesisId);

  if (error) return { error: error.message };

  await service.from("activity_logs").insert({
    user_id: auth.user.id,
    action: "Corrected extracted abstract",
    thesis_id: thesisId,
  });

  return {};
}
