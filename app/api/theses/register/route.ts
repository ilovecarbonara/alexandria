import { NextRequest, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isRegisteredOnChain, registerOnChain } from "@/lib/blockchain/actions";
import { checkTitleSimilarity } from "@/lib/similarity";
import {
  THESIS_LEVELS,
  THESIS_CATEGORIES,
  SUBMISSION_TYPES,
} from "@/lib/constants";
import {
  normalizeNameForComparison,
  sanitizeTextInput,
  validateAuthorList,
  validateTitle,
  validateUUID,
} from "@/lib/validation";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const VALID_LEVELS = THESIS_LEVELS.map((l) => l.value as string);
const VALID_TYPES = SUBMISSION_TYPES.map((t) => t.value as string);
const VALID_CATEGORIES: readonly string[] = THESIS_CATEGORIES;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: NextRequest) {
  const ip = await getClientIp();
  const ipLimit = await rateLimit(`register-ip:${ip}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!ipLimit.success) {
    return Response.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 },
    );
  }

  // Authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify account is approved, active, and not admin
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, is_approved, is_active, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    return Response.json({ error: "Account deactivated." }, { status: 403 });
  }

  if (!profile.is_approved) {
    return Response.json({ error: "Account not yet approved." }, { status: 403 });
  }

  if (profile.is_admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: 10 registrations per hour per user
  const rl = await rateLimit(`register:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!rl.success) {
    return Response.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 },
    );
  }

  // Parse and validate body
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, authorNames, thesisLevel, thesisCategory, submissionType, sha256Hash, previousThesisId } =
    body as Record<string, unknown>;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    !Array.isArray(authorNames) ||
    !authorNames.every((name) => typeof name === "string") ||
    typeof thesisLevel !== "string" ||
    !thesisLevel.trim() ||
    typeof thesisCategory !== "string" ||
    !thesisCategory.trim() ||
    typeof submissionType !== "string" ||
    !submissionType.trim() ||
    typeof sha256Hash !== "string" ||
    !sha256Hash.trim()
  ) {
    return Response.json({ error: "All fields are required." }, { status: 400 });
  }

  if (
    previousThesisId !== undefined &&
    previousThesisId !== null &&
    typeof previousThesisId !== "string"
  ) {
    return Response.json(
      { error: "Invalid previous thesis ID format." },
      { status: 400 },
    );
  }

  const cleanTitle = sanitizeTextInput(title);
  const cleanAuthorNames = authorNames.map((name) => sanitizeTextInput(name));
  const cleanThesisLevel = thesisLevel.trim();
  const cleanThesisCategory = sanitizeTextInput(thesisCategory);
  const cleanSubmissionType = submissionType.trim();
  const cleanSha256Hash = sha256Hash.trim().toLowerCase();
  const cleanPreviousThesisId = previousThesisId?.trim() || null;

  if (!cleanTitle || cleanAuthorNames.some((name) => !name) || !cleanThesisCategory) {
    return Response.json({ error: "All fields are required." }, { status: 400 });
  }

  const titleError = validateTitle(cleanTitle);
  if (titleError) {
    return Response.json({ error: titleError }, { status: 400 });
  }

  const authorError = validateAuthorList(cleanAuthorNames);
  if (authorError) {
    return Response.json({ error: authorError }, { status: 400 });
  }

  const ownerNorm = normalizeNameForComparison(profile.full_name);
  const includesOwner = cleanAuthorNames.some(
    (name) => normalizeNameForComparison(name) === ownerNorm,
  );
  if (!includesOwner) {
    return Response.json(
      { error: "You must be listed as an author of your own thesis." },
      { status: 400 },
    );
  }

  // Validate sha256Hash format (64 hex chars)
  if (!/^[a-f0-9]{64}$/.test(cleanSha256Hash)) {
    return Response.json({ error: "Invalid SHA-256 hash format." }, { status: 400 });
  }

  // Validate enum values before blockchain call (blockchain is immutable)
  if (!VALID_LEVELS.includes(cleanThesisLevel)) {
    return Response.json({ error: "Invalid thesis level." }, { status: 400 });
  }
  if (!VALID_TYPES.includes(cleanSubmissionType)) {
    return Response.json({ error: "Invalid submission type." }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(cleanThesisCategory)) {
    return Response.json({ error: "Invalid thesis category." }, { status: 400 });
  }

  if (cleanPreviousThesisId) {
    if (!validateUUID(cleanPreviousThesisId)) {
      return Response.json(
        { error: "Invalid previous thesis ID format." },
        { status: 400 },
      );
    }

    const service = createServiceClient();
    const { data: prevThesis, error: prevError } = await service
      .from("theses")
      .select("id, user_id")
      .eq("id", cleanPreviousThesisId)
      .single();

    if (prevError || !prevThesis) {
      return Response.json(
        { error: "Previous thesis not found." },
        { status: 400 },
      );
    }

    if (prevThesis.user_id !== user.id) {
      return Response.json(
        { error: "Cannot link to another user's thesis." },
        { status: 400 },
      );
    }

    // Prevent branching: ensure no other thesis already links to this parent
    const { count } = await service
      .from("theses")
      .select("id", { count: "exact", head: true })
      .eq("previous_thesis_id", cleanPreviousThesisId);

    if (count && count > 0) {
      return Response.json(
        { error: "This thesis already has a revision linked to it." },
        { status: 409 },
      );
    }
  }

  // Check blockchain for duplicate
  const alreadyRegistered = await isRegisteredOnChain(cleanSha256Hash);
  if (alreadyRegistered) {
    return Response.json(
      { error: "This document hash is already registered on the blockchain." },
      { status: 409 },
    );
  }

  // Register on blockchain
  let txHash: string;
  let blockTimestamp: number;

  try {
    const result = await registerOnChain(
      cleanSha256Hash,
      cleanSubmissionType,
      cleanThesisLevel,
      cleanThesisCategory,
    );
    txHash = result.txHash;
    blockTimestamp = result.blockTimestamp;
  } catch (err) {
    console.error("Blockchain registration failed:", err);
    return Response.json(
      { error: "Blockchain registration failed. Please try again." },
      { status: 500 },
    );
  }

  // Save to Supabase
  const service = createServiceClient();
  const titleNormalized = normalizeTitle(cleanTitle);

  const { data: thesisId, error: saveError } = await service.rpc(
    "register_thesis_with_authors",
    {
      p_user_id: user.id,
      p_title: cleanTitle,
      p_title_normalized: titleNormalized,
      p_thesis_level: cleanThesisLevel as "undergraduate" | "masteral" | "doctoral",
      p_thesis_category: cleanThesisCategory,
      p_submission_type: cleanSubmissionType as "draft" | "final",
      p_sha256_hash: cleanSha256Hash,
      p_tx_hash: txHash,
      p_block_timestamp: new Date(blockTimestamp * 1000).toISOString(),
      p_previous_thesis_id: cleanPreviousThesisId,
      p_author_names: cleanAuthorNames,
    },
  );

  if (saveError || !thesisId) {
    console.error("Supabase registration save failed after blockchain registration:", {
      error: saveError,
      txHash,
      sha256Hash: cleanSha256Hash,
    });
    return Response.json(
      {
        error:
          "Blockchain registration succeeded, but saving the thesis metadata failed. Please contact an administrator with the transaction hash.",
        txHash,
      },
      { status: 500 },
    );
  }

  // Log activity
  await service.from("activity_logs").insert({
    user_id: user.id,
    action: "Thesis registered on blockchain",
    thesis_id: thesisId,
  });

  // Auto-accept the previous draft when a final version is linked
  if (cleanPreviousThesisId) {
    await service
      .from("theses")
      .update({ status: "accepted" as const })
      .eq("id", cleanPreviousThesisId);

    await service.from("activity_logs").insert({
      user_id: user.id,
      action: "Draft auto-accepted: final version submitted",
      thesis_id: cleanPreviousThesisId,
    });
  }

  // Run similarity check after the response is sent
  after(async () => {
    try {
      await checkTitleSimilarity(thesisId);
    } catch (err) {
      console.error("Similarity check failed:", err);
    }
  });

  return Response.json({ txHash, thesisId });
}
