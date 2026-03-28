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
  // Authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate body
  let body: {
    title: string;
    authorName: string;
    thesisLevel: string;
    thesisCategory: string;
    submissionType: string;
    sha256Hash: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, authorName, thesisLevel, thesisCategory, submissionType, sha256Hash } =
    body;

  if (
    !title?.trim() ||
    !authorName?.trim() ||
    !thesisLevel ||
    !thesisCategory ||
    !submissionType ||
    !sha256Hash
  ) {
    return Response.json({ error: "All fields are required." }, { status: 400 });
  }

  // Validate sha256Hash format (64 hex chars)
  if (!/^[a-f0-9]{64}$/i.test(sha256Hash)) {
    return Response.json({ error: "Invalid SHA-256 hash format." }, { status: 400 });
  }

  // Validate enum values before blockchain call (blockchain is immutable)
  if (!VALID_LEVELS.includes(thesisLevel)) {
    return Response.json({ error: "Invalid thesis level." }, { status: 400 });
  }
  if (!VALID_TYPES.includes(submissionType)) {
    return Response.json({ error: "Invalid submission type." }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(thesisCategory)) {
    return Response.json({ error: "Invalid thesis category." }, { status: 400 });
  }

  // Check blockchain for duplicate
  const alreadyRegistered = await isRegisteredOnChain(sha256Hash);
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
      sha256Hash,
      submissionType,
      thesisLevel,
      thesisCategory,
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
  const titleNormalized = normalizeTitle(title);

  const { data: thesis, error: insertError } = await service
    .from("theses")
    .insert({
      user_id: user.id,
      title: title.trim(),
      title_normalized: titleNormalized,
      author_name: authorName.trim(),
      thesis_level: thesisLevel as "undergraduate" | "masteral" | "doctoral",
      thesis_category: thesisCategory,
      submission_type: submissionType as "draft" | "final",
      sha256_hash: sha256Hash,
      tx_hash: txHash,
      block_timestamp: new Date(blockTimestamp * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Supabase insert failed:", insertError);
    return Response.json(
      { error: "Failed to save thesis record." },
      { status: 500 },
    );
  }

  // Log activity
  await service.from("activity_logs").insert({
    user_id: user.id,
    action: "Thesis registered on blockchain",
  });

  // Run similarity check after the response is sent
  after(async () => {
    try {
      await checkTitleSimilarity(thesis.id);
    } catch (err) {
      console.error("Similarity check failed:", err);
    }
  });

  return Response.json({ txHash, thesisId: thesis.id });
}
