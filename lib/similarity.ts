import { createServiceClient } from "@/lib/supabase/service";
import { sendTitleAlertEmail } from "@/lib/email";
import { DEFAULT_TITLE_ALERT_THRESHOLD } from "@/lib/constants";

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

  for (const match of otherAuthorMatches) {
    const { data: matchedUser } = await service
      .from("users")
      .select("email, full_name")
      .eq("id", match.user_id)
      .single();

    if (!matchedUser) continue;

    const emailResult = await sendTitleAlertEmail({
      recipientEmail: matchedUser.email,
      recipientName: matchedUser.full_name,
      theirTitle: match.title,
      incomingTitle: thesis.title,
      txHash: thesis.tx_hash,
      registeredAt: thesis.registered_at,
    });

    await service.from("title_alerts").insert({
      new_thesis_id: thesis.id,
      matched_thesis_id: match.thesis_id,
      notified_user_id: match.user_id,
      similarity_score: match.similarity_score,
      status: emailResult.success ? "sent" : "failed",
    });
  }
}
