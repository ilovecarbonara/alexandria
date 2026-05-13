import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_TITLE_ALERT_THRESHOLD,
  DEFAULT_AUTO_FLAG_THRESHOLD,
} from "@/lib/constants";

type ServiceClient = SupabaseClient<Database>;
type SimilarTitleMatch =
  Database["public"]["Functions"]["find_similar_titles"]["Returns"][number];
type ThesisChainRow = Pick<
  Database["public"]["Tables"]["theses"]["Row"],
  "id" | "previous_thesis_id"
>;

function resolveChainRoot(
  thesisId: string,
  chainRowsById: Map<string, ThesisChainRow>,
) {
  const visited = new Set<string>();
  let currentId = thesisId;

  while (true) {
    if (visited.has(currentId)) return currentId;
    visited.add(currentId);

    const current = chainRowsById.get(currentId);
    if (!current?.previous_thesis_id) return currentId;

    currentId = current.previous_thesis_id;
  }
}

async function getVersionChainRoots(
  service: ServiceClient,
  thesisIds: string[],
) {
  const uniqueThesisIds = [...new Set(thesisIds)];
  const chainRowsById = new Map<string, ThesisChainRow>();
  const fetchedIds = new Set<string>();
  let pendingIds = new Set(uniqueThesisIds);

  while (pendingIds.size > 0) {
    const idsToFetch = [...pendingIds].filter((id) => !fetchedIds.has(id));
    pendingIds = new Set<string>();

    if (idsToFetch.length === 0) break;
    idsToFetch.forEach((id) => fetchedIds.add(id));

    const { data, error } = await service
      .from("theses")
      .select("id, previous_thesis_id")
      .in("id", idsToFetch);

    if (error) {
      console.error("Similarity check: failed to load version chains", error);
      return null;
    }

    for (const row of data ?? []) {
      chainRowsById.set(row.id, row);

      if (
        row.previous_thesis_id &&
        !chainRowsById.has(row.previous_thesis_id) &&
        !fetchedIds.has(row.previous_thesis_id)
      ) {
        pendingIds.add(row.previous_thesis_id);
      }
    }
  }

  return new Map(
    uniqueThesisIds.map((id) => [id, resolveChainRoot(id, chainRowsById)]),
  );
}

async function deduplicateMatchesByVersionChain(
  service: ServiceClient,
  matches: SimilarTitleMatch[],
) {
  const chainRootsByThesisId = await getVersionChainRoots(
    service,
    matches.map((match) => match.thesis_id),
  );

  if (!chainRootsByThesisId) return matches;

  const bestMatchesByChainRoot = new Map<string, SimilarTitleMatch>();

  for (const match of matches) {
    const chainRootId =
      chainRootsByThesisId.get(match.thesis_id) ?? match.thesis_id;
    const existing = bestMatchesByChainRoot.get(chainRootId);

    if (!existing || match.similarity_score > existing.similarity_score) {
      bestMatchesByChainRoot.set(chainRootId, match);
    }
  }

  return [...bestMatchesByChainRoot.values()].sort(
    (a, b) => b.similarity_score - a.similarity_score,
  );
}

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

  const deduplicatedMatches = await deduplicateMatchesByVersionChain(
    service,
    otherAuthorMatches,
  );

  let autoFlagged = false;

  for (const match of deduplicatedMatches) {
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

      // Open the dispute thread, then post the auto-flag opening message
      // authored by the matched thesis owner (the de-facto flagger).
      const { data: created, error: disputeError } = await service
        .from("disputes")
        .insert({
          thesis_id: thesis.id,
          flagged_by: match.user_id,
        })
        .select("id")
        .single();

      if (!disputeError && created) {
        await service.from("dispute_messages").insert({
          dispute_id: created.id,
          author_id: match.user_id,
          author_role: "flagger",
          body: `Auto-flagged: ${score}% similarity with "${match.title}"`,
        });

        // Pre-mark the flagger as having read their own opening message.
        await service.from("dispute_reads").insert({
          dispute_id: created.id,
          user_id: match.user_id,
        });
      }

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
