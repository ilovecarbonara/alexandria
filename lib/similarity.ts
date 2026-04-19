import { createServiceClient } from "@/lib/supabase/service";
import {
  DEFAULT_TITLE_ALERT_THRESHOLD,
  DEFAULT_AUTO_FLAG_THRESHOLD,
} from "@/lib/constants";

export async function checkTitleSimilarity(thesisId: string) {
  const service = createServiceClient();

  const { data: thesis, error: thesisError } = await service
    .from("theses")
    .select("id, title, title_normalized, tx_hash, registered_at, user_id")
    .eq("id", thesisId)
    .single();

  if (thesisError || !thesis) {
    console.error("Similarity check: thesis not found", thesisError);
    return;
  }

  const threshold =
    parseFloat(process.env.TITLE_ALERT_THRESHOLD || "") ||
    DEFAULT_TITLE_ALERT_THRESHOLD;

  const autoFlagThreshold =
    parseFloat(process.env.AUTO_FLAG_THRESHOLD || "") ||
    DEFAULT_AUTO_FLAG_THRESHOLD;

  const { data: matches, error: rpcError } = await service.rpc(
    "find_similar_titles",
    {
      target_title: thesis.title_normalized,
      similarity_threshold: threshold,
      exclude_thesis_id: thesis.id,
    },
  );

  if (rpcError) {
    console.error("Similarity RPC failed:", rpcError);
    return;
  }

  if (!matches || matches.length === 0) return;

  // Skip same-author matches (e.g. Draft → Final by the same user)
  const otherAuthorMatches = matches.filter(
    (m) => m.user_id !== thesis.user_id,
  );

  if (otherAuthorMatches.length === 0) return;

  let autoFlagged = false;

  for (const match of otherAuthorMatches) {
    await service.from("title_alerts").insert({
      new_thesis_id: thesis.id,
      matched_thesis_id: match.thesis_id,
      notified_user_id: match.user_id,
      similarity_score: match.similarity_score,
      status: "notified",
    });

    // Auto-flag the incoming thesis when similarity meets the auto-flag threshold
    if (!autoFlagged && match.similarity_score >= autoFlagThreshold) {
      const score = (match.similarity_score * 100).toFixed(1);

      await service.from("disputes").insert({
        thesis_id: thesis.id,
        flagged_by: match.user_id,
        reason: `Auto-flagged: ${score}% similarity with "${match.title}"`,
      });

      await service
        .from("theses")
        .update({ status: "flagged" })
        .eq("id", thesis.id);

      await service.from("activity_logs").insert({
        user_id: match.user_id,
        action: `Thesis auto-flagged due to ${score}% title similarity`,
        thesis_id: thesis.id,
      });

      autoFlagged = true;
    }
  }
}
