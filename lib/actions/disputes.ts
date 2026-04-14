"use server";

import { requireAuth } from "./auth-guards";
import { logActivity } from "./activity";
import { MAX_REASON_LENGTH, validateUUID } from "@/lib/validation";

export async function flagDispute(
  thesisId: string,
  reason: string,
): Promise<{ error?: string }> {
  if (!thesisId || !reason?.trim()) {
    return { error: "Thesis ID and reason are required." };
  }

  if (!validateUUID(thesisId)) {
    return { error: "Invalid thesis ID format." };
  }

  if (reason.trim().length > MAX_REASON_LENGTH) {
    return { error: `Reason must be ${MAX_REASON_LENGTH} characters or less.` };
  }

  const auth = await requireAuth();
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

  const { error } = await auth.supabase.from("disputes").insert({
    thesis_id: thesisId,
    flagged_by: auth.user.id,
    reason: reason.trim(),
  });

  if (error) {
    return { error: error.message };
  }

  await logActivity("Dispute filed");

  return {};
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
