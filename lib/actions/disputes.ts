"use server";

import { requireAuth, requireStudent } from "./auth-guards";
import { logActivity } from "./activity";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import {
  MAX_REASON_LENGTH,
  validateUUID,
  sanitizeTextInput,
} from "@/lib/validation";
import type { DisputeAuthorRole, DisputeStatus } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// View types returned to the UI
// ---------------------------------------------------------------------------

export type DisputeViewerRole = DisputeAuthorRole;

export interface DisputeMessageView {
  id: string;
  body: string;
  created_at: string;
  author_role: DisputeAuthorRole;
  /** Display name from the viewer's perspective (anonymized when appropriate). */
  author_display_name: string;
  /** True when the viewer authored this message. */
  is_own: boolean;
}

export interface DisputeThreadView {
  id: string;
  thesis_id: string;
  thesis_title: string;
  status: DisputeStatus;
  created_at: string;
  resolved_at: string | null;
  /** Viewer's role in this dispute. */
  viewer_role: DisputeViewerRole;
  /** Other-party display names (anonymized when appropriate). */
  flagger_display_name: string;
  owner_display_name: string;
  messages: DisputeMessageView[];
}

export interface DisputeSummaryView {
  id: string;
  thesis_id: string;
  thesis_title: string;
  status: DisputeStatus;
  created_at: string;
  resolved_at: string | null;
  /** Display name of the counterparty most relevant to this list view. */
  counterparty_display_name: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_role: DisputeAuthorRole | null;
  unread_count: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANONYMOUS_FLAGGER_LABEL = "Anonymous flagger";
const PREVIEW_LENGTH = 140;

// ---------------------------------------------------------------------------
// Role detection + anonymization (single source of truth)
// ---------------------------------------------------------------------------

interface DisputeContext {
  dispute: {
    id: string;
    thesis_id: string;
    flagged_by: string;
    status: DisputeStatus;
    created_at: string;
    resolved_at: string | null;
  };
  thesis: { id: string; user_id: string; title: string };
  flaggerName: string;
  ownerName: string;
  viewerRole: DisputeViewerRole;
}

/**
 * Loads a dispute together with the viewer's role, enforces participant
 * access, and returns the names needed to render the thread.
 *
 * Uses the service client because the viewer needs to see counterparty names
 * (which RLS on `users` would normally hide). Authorization is decided here.
 */
async function loadDisputeContext(
  disputeId: string,
  viewerId: string,
  isAdmin: boolean,
): Promise<DisputeContext | { error: string }> {
  if (!validateUUID(disputeId)) return { error: "Invalid dispute ID format." };

  const service = createServiceClient();

  const { data: dispute } = await service
    .from("disputes")
    .select("id, thesis_id, flagged_by, status, created_at, resolved_at")
    .eq("id", disputeId)
    .single();

  if (!dispute) return { error: "Dispute not found." };

  const { data: thesis } = await service
    .from("theses")
    .select("id, user_id, title")
    .eq("id", dispute.thesis_id)
    .single();

  if (!thesis) return { error: "Thesis not found." };

  const viewerRole: DisputeViewerRole | null = isAdmin
    ? "admin"
    : viewerId === dispute.flagged_by
      ? "flagger"
      : viewerId === thesis.user_id
        ? "owner"
        : null;

  if (!viewerRole) return { error: "Forbidden" };

  const { data: users } = await service
    .from("users")
    .select("id, full_name")
    .in("id", [dispute.flagged_by, thesis.user_id]);

  const nameMap = new Map(
    (users ?? []).map((u) => [u.id, u.full_name] as const),
  );

  return {
    dispute,
    thesis,
    flaggerName: nameMap.get(dispute.flagged_by) ?? "Unknown",
    ownerName: nameMap.get(thesis.user_id) ?? "Unknown",
    viewerRole,
  };
}

/**
 * Returns the name to display for `targetRole` from the perspective of
 * `viewerRole`. The flagger is anonymized whenever the thesis owner is the
 * one viewing the thread.
 */
function displayNameFor(
  targetRole: DisputeAuthorRole,
  viewerRole: DisputeViewerRole,
  ctx: { flaggerName: string; ownerName: string },
): string {
  if (targetRole === "admin") return "Admin";
  if (targetRole === "flagger") {
    return viewerRole === "owner" ? ANONYMOUS_FLAGGER_LABEL : ctx.flaggerName;
  }
  return ctx.ownerName;
}

function truncatePreview(body: string): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  return collapsed.length > PREVIEW_LENGTH
    ? collapsed.slice(0, PREVIEW_LENGTH) + "…"
    : collapsed;
}

function truncateTitle(title: string, max = 80): string {
  return title.length > max ? title.slice(0, max) + "…" : title;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function flagDispute(
  thesisId: string,
  reason: string,
): Promise<{ error?: string; disputeId?: string }> {
  if (!thesisId || !reason?.trim()) {
    return { error: "Thesis ID and reason are required." };
  }

  if (!validateUUID(thesisId)) {
    return { error: "Invalid thesis ID format." };
  }

  const cleanReason = sanitizeTextInput(reason.trim());
  if (!cleanReason) return { error: "Reason is required." };
  if (cleanReason.length > MAX_REASON_LENGTH) {
    return { error: `Reason must be ${MAX_REASON_LENGTH} characters or less.` };
  }

  const auth = await requireStudent();
  if ("error" in auth) return { error: auth.error };

  // Prevent self-flagging
  const { data: thesis } = await auth.supabase
    .from("theses")
    .select("user_id")
    .eq("id", thesisId)
    .single();

  if (!thesis) return { error: "Thesis not found." };
  if (thesis.user_id === auth.user.id) {
    return { error: "You cannot flag your own thesis." };
  }

  const { data: created, error } = await auth.supabase
    .from("disputes")
    .insert({ thesis_id: thesisId, flagged_by: auth.user.id })
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Failed to file dispute." };
  }

  const { error: msgError } = await auth.supabase
    .from("dispute_messages")
    .insert({
      dispute_id: created.id,
      author_id: auth.user.id,
      author_role: "flagger",
      body: cleanReason,
    });

  if (msgError) {
    // Roll back the empty dispute so we don't leave a thread with no opening.
    await auth.supabase.from("disputes").delete().eq("id", created.id);
    return { error: msgError.message };
  }

  // Mark the flagger as having read their own opening message.
  await auth.supabase
    .from("dispute_reads")
    .insert({ dispute_id: created.id, user_id: auth.user.id });

  await logActivity("Dispute filed", thesisId);

  return { disputeId: created.id };
}

export async function postDisputeMessage(
  disputeId: string,
  body: string,
): Promise<{ error?: string }> {
  if (!body?.trim()) return { error: "Message body is required." };

  const clean = sanitizeTextInput(body.trim());
  if (!clean) return { error: "Message body is required." };
  if (clean.length > MAX_REASON_LENGTH) {
    return {
      error: `Message must be ${MAX_REASON_LENGTH} characters or less.`,
    };
  }

  const auth = await requireAuth();
  if ("error" in auth) return { error: auth.error };

  // Rate limit: 30 dispute messages per minute per user. Prevents thread
  // spam and keeps activity_logs notifications bounded.
  const rl = await rateLimit(`dispute-msg:${auth.user.id}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.success) {
    return { error: "Too many messages. Please slow down." };
  }

  const ctx = await loadDisputeContext(
    disputeId,
    auth.user.id,
    auth.profile.role === "librarian",
  );
  if ("error" in ctx) return { error: ctx.error };

  if (ctx.dispute.status !== "open") {
    return { error: "This dispute has been resolved and is read-only." };
  }

  const service = createServiceClient();

  const { error } = await service.from("dispute_messages").insert({
    dispute_id: disputeId,
    author_id: auth.user.id,
    author_role: ctx.viewerRole,
    body: clean,
  });

  if (error) return { error: error.message };

  // Author's own messages should never count as unread for themselves.
  await service.from("dispute_reads").upsert(
    {
      dispute_id: disputeId,
      user_id: auth.user.id,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "dispute_id,user_id" },
  );

  // Notify the two other participants via activity logs.
  const truncatedTitle = truncateTitle(ctx.thesis.title);
  const recipients = notificationRecipients(ctx, auth.user.id);
  if (recipients.length > 0) {
    await service.from("activity_logs").insert(
      recipients.map((userId) => ({
        user_id: userId,
        action: `New reply on dispute for "${truncatedTitle}"`,
        thesis_id: ctx.thesis.id,
      })),
    );
  }

  return {};
}

export async function markDisputeRead(
  disputeId: string,
): Promise<{ error?: string }> {
  if (!validateUUID(disputeId)) return { error: "Invalid dispute ID format." };

  const auth = await requireAuth();
  if ("error" in auth) return { error: auth.error };

  // Light rate limit: 60 read marks per minute per user. The upsert is
  // idempotent but a hot client loop could thrash the DB.
  const rl = await rateLimit(`dispute-read:${auth.user.id}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.success) return { error: "Too many requests." };

  // Ensure the caller is actually a participant before recording a read.
  const ctx = await loadDisputeContext(
    disputeId,
    auth.user.id,
    auth.profile.role === "librarian",
  );
  if ("error" in ctx) return { error: ctx.error };

  const service = createServiceClient();
  const { error } = await service.from("dispute_reads").upsert(
    {
      dispute_id: disputeId,
      user_id: auth.user.id,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "dispute_id,user_id" },
  );

  if (error) return { error: error.message };
  return {};
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getDispute(
  disputeId: string,
): Promise<{ error?: string; data?: DisputeThreadView }> {
  const auth = await requireAuth();
  if ("error" in auth) return { error: auth.error };

  const ctx = await loadDisputeContext(
    disputeId,
    auth.user.id,
    auth.profile.role === "librarian",
  );
  if ("error" in ctx) return { error: ctx.error };

  const service = createServiceClient();
  const { data: messages, error } = await service
    .from("dispute_messages")
    .select("id, body, created_at, author_role, author_id")
    .eq("dispute_id", disputeId)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };

  return {
    data: {
      id: ctx.dispute.id,
      thesis_id: ctx.thesis.id,
      thesis_title: ctx.thesis.title,
      status: ctx.dispute.status,
      created_at: ctx.dispute.created_at,
      resolved_at: ctx.dispute.resolved_at,
      viewer_role: ctx.viewerRole,
      flagger_display_name: displayNameFor("flagger", ctx.viewerRole, ctx),
      owner_display_name: displayNameFor("owner", ctx.viewerRole, ctx),
      messages: (messages ?? []).map((m) => ({
        id: m.id,
        body: m.body,
        created_at: m.created_at,
        author_role: m.author_role,
        author_display_name: displayNameFor(m.author_role, ctx.viewerRole, ctx),
        is_own: m.author_id === auth.user.id,
      })),
    },
  };
}

export async function listMyDisputes(): Promise<{
  error?: string;
  data?: DisputeSummaryView[];
}> {
  const auth = await requireAuth();
  if ("error" in auth) return { error: auth.error };

  return loadDisputeSummaries({
    viewerId: auth.user.id,
    isAdmin: auth.profile.role === "librarian",
    filter: { kind: "flagged_by", value: auth.user.id },
  });
}

export async function listDisputesOnMyTheses(): Promise<{
  error?: string;
  data?: DisputeSummaryView[];
}> {
  const auth = await requireAuth();
  if ("error" in auth) return { error: auth.error };

  const service = createServiceClient();
  const { data: theses } = await service
    .from("theses")
    .select("id")
    .eq("user_id", auth.user.id);

  const thesisIds = (theses ?? []).map((t) => t.id);
  if (thesisIds.length === 0) return { data: [] };

  return loadDisputeSummaries({
    viewerId: auth.user.id,
    isAdmin: auth.profile.role === "librarian",
    filter: { kind: "thesis_ids", value: thesisIds },
  });
}

// ---------------------------------------------------------------------------
// Internal: bulk summary loader shared by both list views
// ---------------------------------------------------------------------------

type SummaryFilter =
  | { kind: "flagged_by"; value: string }
  | { kind: "thesis_ids"; value: string[] };

async function loadDisputeSummaries(args: {
  viewerId: string;
  isAdmin: boolean;
  filter: SummaryFilter;
}): Promise<{ error?: string; data?: DisputeSummaryView[] }> {
  const service = createServiceClient();

  let query = service
    .from("disputes")
    .select("id, thesis_id, flagged_by, status, created_at, resolved_at");

  if (args.filter.kind === "flagged_by") {
    query = query.eq("flagged_by", args.filter.value);
  } else {
    query = query.in("thesis_id", args.filter.value);
  }

  const { data: disputes, error } = await query;

  if (error) return { error: error.message };
  if (!disputes || disputes.length === 0) return { data: [] };

  const disputeIds = disputes.map((d) => d.id);
  const thesisIds = [...new Set(disputes.map((d) => d.thesis_id))];
  const flaggerIds = [...new Set(disputes.map((d) => d.flagged_by))];

  const [thesesRes, flaggersRes, messagesRes, readsRes] = await Promise.all([
    service.from("theses").select("id, user_id, title").in("id", thesisIds),
    service.from("users").select("id, full_name").in("id", flaggerIds),
    service
      .from("dispute_messages")
      .select("dispute_id, author_id, author_role, body, created_at")
      .in("dispute_id", disputeIds)
      .order("created_at", { ascending: true }),
    service
      .from("dispute_reads")
      .select("dispute_id, last_read_at")
      .eq("user_id", args.viewerId)
      .in("dispute_id", disputeIds),
  ]);

  const theses = thesesRes.data ?? [];
  const ownerIds = [...new Set(theses.map((t) => t.user_id))];
  const { data: ownerUsers } = ownerIds.length
    ? await service.from("users").select("id, full_name").in("id", ownerIds)
    : { data: [] as { id: string; full_name: string }[] };

  const thesisMap = new Map(theses.map((t) => [t.id, t] as const));
  const flaggerMap = new Map(
    (flaggersRes.data ?? []).map((u) => [u.id, u.full_name] as const),
  );
  const ownerMap = new Map(
    (ownerUsers ?? []).map((u) => [u.id, u.full_name] as const),
  );
  const readMap = new Map(
    (readsRes.data ?? []).map((r) => [r.dispute_id, r.last_read_at] as const),
  );

  const messagesByDispute = new Map<
    string,
    {
      author_id: string;
      author_role: DisputeAuthorRole;
      body: string;
      created_at: string;
    }[]
  >();
  for (const m of messagesRes.data ?? []) {
    const arr = messagesByDispute.get(m.dispute_id) ?? [];
    arr.push(m);
    messagesByDispute.set(m.dispute_id, arr);
  }

  const summaries: DisputeSummaryView[] = disputes.map((d) => {
    const thesis = thesisMap.get(d.thesis_id);
    const flaggerName = flaggerMap.get(d.flagged_by) ?? "Unknown";
    const ownerName = thesis
      ? (ownerMap.get(thesis.user_id) ?? "Unknown")
      : "Unknown";
    const viewerRole: DisputeViewerRole = args.isAdmin
      ? "admin"
      : args.filter.kind === "flagged_by"
        ? "flagger"
        : "owner";

    const msgs = messagesByDispute.get(d.id) ?? [];
    const last = msgs[msgs.length - 1];
    const lastReadAt = readMap.get(d.id);
    const unread = msgs.filter(
      (m) =>
        m.author_id !== args.viewerId &&
        (!lastReadAt || m.created_at > lastReadAt),
    ).length;

    // Counterparty for the list row:
    // - "filed by me" view → show the thesis owner's name
    // - "on my theses" view → show the flagger (anonymized for owner)
    const counterparty =
      args.filter.kind === "flagged_by"
        ? ownerName
        : displayNameFor("flagger", viewerRole, { flaggerName, ownerName });

    return {
      id: d.id,
      thesis_id: d.thesis_id,
      thesis_title: thesis?.title ?? "Untitled",
      status: d.status,
      created_at: d.created_at,
      resolved_at: d.resolved_at,
      counterparty_display_name: counterparty,
      last_message_at: last?.created_at ?? null,
      last_message_preview: last ? truncatePreview(last.body) : null,
      last_message_role: last?.author_role ?? null,
      unread_count: unread,
    };
  });

  // Sort by most recent activity (last message; falls back to created_at).
  summaries.sort((a, b) => {
    const av = a.last_message_at ?? a.created_at;
    const bv = b.last_message_at ?? b.created_at;
    return bv.localeCompare(av);
  });

  return { data: summaries };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/**
 * The two participants other than the actor that should be notified when a
 * new message is posted. Admin reply notifications go to flagger + owner;
 * flagger/owner replies go to admin via the admin disputes view (no per-admin
 * activity_logs row to keep the inbox clean) plus the other participant.
 *
 * For the current iteration we notify both non-actor participants uniformly;
 * admin awareness is handled by the admin-side unread count, not activity
 * logs.
 */
function notificationRecipients(
  ctx: DisputeContext,
  actorId: string,
): string[] {
  const recipients = new Set<string>();
  if (ctx.dispute.flagged_by !== actorId) recipients.add(ctx.dispute.flagged_by);
  if (ctx.thesis.user_id !== actorId) recipients.add(ctx.thesis.user_id);
  return [...recipients];
}

// ---------------------------------------------------------------------------
// Existing helper preserved
// ---------------------------------------------------------------------------

/**
 * Returns the total number of unread dispute messages addressed to the
 * current viewer across every thread they participate in. Used by the
 * sidebar badge.
 *
 * - Students: counts unreads from disputes they filed plus disputes on
 *   theses they own.
 * - Admins: counts unreads from every open dispute (admin participates in
 *   all threads).
 *
 * Returns 0 on any failure so the badge stays silent rather than crashing
 * the layout.
 */
export async function countMyDisputeUnreads(): Promise<number> {
  const auth = await requireAuth();
  if ("error" in auth) return 0;

  const service = createServiceClient();
  const viewerId = auth.user.id;
  const isAdmin = auth.profile.role === "librarian";

  let disputeIds: string[] = [];

  if (isAdmin) {
    const { data } = await service
      .from("disputes")
      .select("id")
      .eq("status", "open");
    disputeIds = (data ?? []).map((d) => d.id);
  } else {
    const [filedRes, ownedThesesRes] = await Promise.all([
      service.from("disputes").select("id").eq("flagged_by", viewerId),
      service.from("theses").select("id").eq("user_id", viewerId),
    ]);
    const ids = new Set<string>((filedRes.data ?? []).map((d) => d.id));
    const ownedThesisIds = (ownedThesesRes.data ?? []).map((t) => t.id);
    if (ownedThesisIds.length > 0) {
      const { data: onMine } = await service
        .from("disputes")
        .select("id")
        .in("thesis_id", ownedThesisIds);
      for (const d of onMine ?? []) ids.add(d.id);
    }
    disputeIds = [...ids];
  }

  if (disputeIds.length === 0) return 0;

  const [messagesRes, readsRes] = await Promise.all([
    service
      .from("dispute_messages")
      .select("dispute_id, author_id, created_at")
      .in("dispute_id", disputeIds),
    service
      .from("dispute_reads")
      .select("dispute_id, last_read_at")
      .eq("user_id", viewerId)
      .in("dispute_id", disputeIds),
  ]);

  const readMap = new Map(
    (readsRes.data ?? []).map((r) => [r.dispute_id, r.last_read_at] as const),
  );

  let count = 0;
  for (const m of messagesRes.data ?? []) {
    if (m.author_id === viewerId) continue;
    const lastRead = readMap.get(m.dispute_id);
    if (!lastRead || m.created_at > lastRead) count++;
  }
  return count;
}

export async function getThesisSimilarityContext(
  thesisId: string,
): Promise<{ score: number; matchedThesisTitle: string } | null> {
  if (!thesisId || !validateUUID(thesisId)) return null;

  const auth = await requireAuth();
  if ("error" in auth) return null;

  // Get the target thesis title
  const { data: target } = await auth.supabase
    .from("theses")
    .select("title_normalized")
    .eq("id", thesisId)
    .single();

  if (!target) return null;

  // Get the current user's theses
  const { data: userTheses } = await auth.supabase
    .from("theses")
    .select("title, title_normalized")
    .eq("user_id", auth.user.id);

  if (!userTheses || userTheses.length === 0) return null;

  // Find the highest similarity match using pg_trgm
  const { data: matches } = await auth.supabase.rpc("find_similar_titles", {
    target_title: target.title_normalized,
    similarity_threshold: 0,
    exclude_thesis_id: thesisId,
  });

  if (!matches || matches.length === 0) return null;

  // Filter to only the current user's theses and find the best match
  const userThesisNormalized = new Set(
    userTheses.map((t) => t.title_normalized),
  );

  let best: { score: number; title: string } | null = null;
  for (const m of matches) {
    if (
      userThesisNormalized.has(m.title_normalized) &&
      (!best || m.similarity_score > best.score)
    ) {
      best = { score: m.similarity_score, title: m.title };
    }
  }

  if (!best) return null;

  return { score: best.score, matchedThesisTitle: best.title };
}
