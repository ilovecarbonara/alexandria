import { NextRequest, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireResearcher } from "@/lib/actions/auth-guards";
import { isRegisteredOnChain, registerOnChain } from "@/lib/blockchain/actions";
import { checkTitleSimilarity } from "@/lib/similarity";
import {
  THESIS_LEVELS,
  THESIS_CATEGORIES,
  SUBMISSION_TYPES,
} from "@/lib/constants";
import {
  normalizeNameForComparison,
  normalizeTitle,
  sanitizeTextInput,
  validateAuthorList,
  validateTitle,
  validateUUID,
} from "@/lib/validation";
import { archivePath, moveObject, removeObjects } from "@/lib/storage";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import type { ThesisLevel, SubmissionType } from "@/lib/supabase/types";

const VALID_LEVELS = THESIS_LEVELS.map((l) => l.value as string);
const VALID_TYPES = SUBMISSION_TYPES.map((t) => t.value as string);
const VALID_CATEGORIES: readonly string[] = THESIS_CATEGORIES;

/**
 * Step 3 of 3 in the submission flow.
 *
 * By the time this runs the manuscript is already staged, hashed server-side,
 * checked for duplicates, and parsed for its abstract (/upload/process). This
 * handler validates the metadata, writes the proof-of-existence record on
 * chain, promotes the file into the archive, and drops the thesis into the
 * review pipeline.
 *
 * A Final enters the assigned adviser's queue. A Draft skips review entirely
 * and stays private to its owner and the librarian.
 */
export async function POST(request: NextRequest) {
  const ip = await getClientIp();
  const ipLimit = await rateLimit(`register-ip:${ip}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!ipLimit.success) {
    return Response.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 },
    );
  }

  const auth = await requireResearcher();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: 403 });
  }

  const rl = await rateLimit(`register:${auth.user.id}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.success) {
    return Response.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    stagedId,
    title,
    authorNames,
    thesisLevel,
    thesisCategory,
    submissionType,
    adviserId,
    previousThesisId,
  } = body as Record<string, unknown>;

  if (
    typeof stagedId !== "string" ||
    typeof title !== "string" ||
    !title.trim() ||
    !Array.isArray(authorNames) ||
    !authorNames.every((name) => typeof name === "string") ||
    typeof thesisLevel !== "string" ||
    !thesisLevel.trim() ||
    typeof thesisCategory !== "string" ||
    !thesisCategory.trim() ||
    typeof submissionType !== "string" ||
    !submissionType.trim()
  ) {
    return Response.json({ error: "All fields are required." }, { status: 400 });
  }

  if (!validateUUID(stagedId)) {
    return Response.json({ error: "Invalid upload reference." }, { status: 400 });
  }

  for (const [value, label] of [
    [adviserId, "adviser"],
    [previousThesisId, "previous thesis"],
  ] as const) {
    if (value !== undefined && value !== null && typeof value !== "string") {
      return Response.json(
        { error: `Invalid ${label} reference.` },
        { status: 400 },
      );
    }
  }

  const cleanTitle = sanitizeTextInput(title);
  const cleanAuthorNames = authorNames.map((name) => sanitizeTextInput(name));
  const cleanThesisLevel = thesisLevel.trim();
  const cleanThesisCategory = sanitizeTextInput(thesisCategory);
  const cleanSubmissionType = submissionType.trim();
  const cleanAdviserId = (adviserId as string | null | undefined)?.trim() || null;
  const cleanPreviousThesisId =
    (previousThesisId as string | null | undefined)?.trim() || null;

  if (!cleanTitle || cleanAuthorNames.some((name) => !name) || !cleanThesisCategory) {
    return Response.json({ error: "All fields are required." }, { status: 400 });
  }

  const titleError = validateTitle(cleanTitle);
  if (titleError) return Response.json({ error: titleError }, { status: 400 });

  const authorError = validateAuthorList(cleanAuthorNames);
  if (authorError) return Response.json({ error: authorError }, { status: 400 });

  const ownerNorm = normalizeNameForComparison(auth.profile.full_name);
  const includesOwner = cleanAuthorNames.some(
    (name) => normalizeNameForComparison(name) === ownerNorm,
  );
  if (!includesOwner) {
    return Response.json(
      { error: "You must be listed as an author of your own thesis." },
      { status: 400 },
    );
  }

  // Validate enums before the chain call — the blockchain write is irreversible.
  if (!VALID_LEVELS.includes(cleanThesisLevel)) {
    return Response.json({ error: "Invalid thesis level." }, { status: 400 });
  }
  if (!VALID_TYPES.includes(cleanSubmissionType)) {
    return Response.json({ error: "Invalid submission type." }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(cleanThesisCategory)) {
    return Response.json({ error: "Invalid thesis category." }, { status: 400 });
  }

  const service = createServiceClient();

  // --- The staged manuscript -------------------------------------------------

  const { data: staged } = await service
    .from("staged_uploads")
    .select(
      "id, user_id, sha256_hash, storage_path, abstract, abstract_confidence, keywords, page_count, size_bytes",
    )
    .eq("id", stagedId)
    .single();

  if (!staged || staged.user_id !== auth.user.id) {
    return Response.json(
      { error: "Your upload has expired. Please upload the manuscript again." },
      { status: 400 },
    );
  }

  if (!staged.abstract) {
    return Response.json(
      { error: "No abstract was extracted from this upload. Please upload the manuscript again." },
      { status: 400 },
    );
  }

  // --- Adviser ---------------------------------------------------------------

  const isFinal = cleanSubmissionType === "final";

  if (isFinal) {
    if (!cleanAdviserId || !validateUUID(cleanAdviserId)) {
      return Response.json(
        { error: "Choose the research adviser who will review this submission." },
        { status: 400 },
      );
    }

    const { data: adviser } = await service
      .from("users")
      .select("id, role, is_active, approval_status")
      .eq("id", cleanAdviserId)
      .single();

    if (
      !adviser ||
      adviser.role !== "adviser" ||
      !adviser.is_active ||
      adviser.approval_status !== "approved"
    ) {
      return Response.json(
        { error: "That research adviser is not available." },
        { status: 400 },
      );
    }
  }

  // --- Revision link ---------------------------------------------------------

  if (cleanPreviousThesisId) {
    if (!validateUUID(cleanPreviousThesisId)) {
      return Response.json(
        { error: "Invalid previous thesis reference." },
        { status: 400 },
      );
    }

    const { data: prevThesis } = await service
      .from("theses")
      .select("id, user_id, submission_type")
      .eq("id", cleanPreviousThesisId)
      .single();

    if (!prevThesis) {
      return Response.json({ error: "Previous thesis not found." }, { status: 400 });
    }

    if (prevThesis.user_id !== auth.user.id) {
      return Response.json(
        { error: "Cannot link to another user's thesis." },
        { status: 400 },
      );
    }

    // Chains stay linear: one predecessor, one successor.
    const { count } = await service
      .from("theses")
      .select("id", { count: "exact", head: true })
      .eq("previous_thesis_id", cleanPreviousThesisId);

    if (count && count > 0) {
      return Response.json(
        { error: "This draft already has a revision linked to it." },
        { status: 409 },
      );
    }
  }

  // --- Proof of existence ----------------------------------------------------

  // Re-checked here as well as in /upload/process: minutes may have passed
  // while the form was being filled in.
  const alreadyRegistered = await isRegisteredOnChain(staged.sha256_hash);
  if (alreadyRegistered) {
    await removeObjects([staged.storage_path]);
    await service.from("staged_uploads").delete().eq("id", staged.id);
    return Response.json(
      { error: "This exact manuscript has already been registered." },
      { status: 409 },
    );
  }

  let txHash: string;
  let blockTimestamp: number;

  try {
    const result = await registerOnChain(
      staged.sha256_hash,
      cleanSubmissionType,
      cleanThesisLevel,
      cleanThesisCategory,
    );
    txHash = result.txHash;
    blockTimestamp = result.blockTimestamp;
  } catch (err) {
    console.error("Blockchain registration failed:", err);
    return Response.json(
      { error: "Could not record the manuscript. Please try again." },
      { status: 500 },
    );
  }

  // --- Persist ---------------------------------------------------------------

  const { data: thesisId, error: saveError } = await service.rpc(
    "register_thesis_with_authors",
    {
      p_user_id: auth.user.id,
      p_adviser_id: isFinal ? cleanAdviserId : null,
      p_title: cleanTitle,
      p_title_normalized: normalizeTitle(cleanTitle),
      p_abstract: staged.abstract,
      p_abstract_confidence: staged.abstract_confidence,
      p_keywords: staged.keywords ?? [],
      p_thesis_level: cleanThesisLevel as ThesisLevel,
      p_thesis_category: cleanThesisCategory,
      p_submission_type: cleanSubmissionType as SubmissionType,
      p_sha256_hash: staged.sha256_hash,
      p_tx_hash: txHash,
      p_block_timestamp: new Date(blockTimestamp * 1000).toISOString(),
      // Filled in below, once the object has an id-based home.
      p_pdf_path: null,
      p_pdf_size_bytes: staged.size_bytes,
      p_pdf_page_count: staged.page_count,
      p_previous_thesis_id: cleanPreviousThesisId,
      p_author_names: cleanAuthorNames,
    },
  );

  if (saveError || !thesisId) {
    console.error("Metadata save failed after blockchain registration:", {
      error: saveError,
      txHash,
      sha256: staged.sha256_hash,
    });
    return Response.json(
      {
        error:
          "The manuscript was recorded but saving its details failed. Contact the librarian with this transaction reference.",
        txHash,
      },
      { status: 500 },
    );
  }

  // --- Archive the manuscript ------------------------------------------------

  const finalPath = archivePath(thesisId, staged.sha256_hash);
  const moved = await moveObject(staged.storage_path, finalPath);

  if (moved.error) {
    // The row exists but points at nothing readable. Leave the manuscript where
    // it is and record that path instead of losing the file entirely.
    console.error("Could not move manuscript into the archive:", moved.error);
    await service
      .from("theses")
      .update({ pdf_path: staged.storage_path })
      .eq("id", thesisId);
  } else {
    await service
      .from("theses")
      .update({ pdf_path: finalPath })
      .eq("id", thesisId);
  }

  await service.from("staged_uploads").delete().eq("id", staged.id);

  await service.from("activity_logs").insert({
    user_id: auth.user.id,
    action: isFinal
      ? "Thesis submitted for adviser review"
      : "Draft archived",
    thesis_id: thesisId,
  });

  // Runs after the response is sent.
  after(async () => {
    try {
      await checkTitleSimilarity(thesisId);
    } catch (err) {
      console.error("Similarity check failed:", err);
    }
  });

  return Response.json({ txHash, thesisId, submissionType: cleanSubmissionType });
}
