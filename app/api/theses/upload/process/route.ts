import { NextRequest } from "next/server";
import { requireResearcher } from "@/lib/actions/auth-guards";
import { createServiceClient } from "@/lib/supabase/service";
import { isRegisteredOnChain } from "@/lib/blockchain/actions";
import { extractAbstract, looksLikePdf } from "@/lib/pdf/extract";
import {
  downloadObject,
  removeObjects,
  sha256Hex,
  stagingPath,
} from "@/lib/storage";
import { MAX_PDF_FILE_SIZE_BYTES, MAX_PDF_FILE_SIZE_MB } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeTextInput } from "@/lib/validation";

/**
 * Step 2 of 3 in the submission flow.
 *
 * Reads the staged manuscript back out of Storage and does everything that has
 * to be true before the metadata form is worth filling in:
 *
 *   1. it really is a PDF (magic bytes, not a claimed MIME type)
 *   2. the SHA-256 is computed HERE, from the stored bytes
 *   3. that hash is not already on-chain
 *   4. the abstract can actually be read out of it
 *
 * Computing the hash server-side closes the trust boundary the old design
 * documented as explicit: the client used to hash locally and the server took
 * its word for it. The bytes we hash are now the bytes we archive.
 */
export async function POST(request: NextRequest) {
  const auth = await requireResearcher();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: 403 });
  }

  // Parsing is the expensive step, so it gets its own budget.
  const rl = await rateLimit(`upload-process:${auth.user.id}`, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.success) {
    return Response.json(
      { error: "Too many uploads. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { clientHash, filename } = (body ?? {}) as Record<string, unknown>;

  if (typeof clientHash !== "string" || !/^[a-f0-9]{64}$/i.test(clientHash)) {
    return Response.json({ error: "Invalid file reference." }, { status: 400 });
  }

  // The path is built from the caller's own id, so one researcher can never
  // point this at another researcher's staged upload.
  const path = stagingPath(auth.user.id, clientHash.toLowerCase());

  const downloaded = await downloadObject(path);
  if ("error" in downloaded) {
    return Response.json(
      { error: "The upload could not be read back. Please try again." },
      { status: 400 },
    );
  }

  const bytes = downloaded.data;

  if (bytes.byteLength > MAX_PDF_FILE_SIZE_BYTES) {
    await removeObjects([path]);
    return Response.json(
      { error: `The manuscript must be ${MAX_PDF_FILE_SIZE_MB} MB or smaller.` },
      { status: 400 },
    );
  }

  if (!looksLikePdf(bytes)) {
    await removeObjects([path]);
    return Response.json(
      { error: "That file is not a PDF. Please upload the manuscript as a PDF." },
      { status: 400 },
    );
  }

  // The authoritative hash: taken from the bytes now sitting in the archive.
  const sha256 = await sha256Hex(bytes);

  let alreadyRegistered: boolean;
  try {
    alreadyRegistered = await isRegisteredOnChain(sha256);
  } catch {
    return Response.json(
      { error: "Could not reach the registry to check for duplicates. Please try again." },
      { status: 503 },
    );
  }

  if (alreadyRegistered) {
    await removeObjects([path]);
    return Response.json(
      { error: "This exact manuscript has already been registered." },
      { status: 409 },
    );
  }

  const extraction = await extractAbstract(bytes);

  if (!extraction.ok) {
    // A manuscript we cannot read the abstract from is not archivable, so the
    // staged object goes with it.
    await removeObjects([path]);
    return Response.json(
      { error: extraction.message, reason: extraction.reason },
      { status: 422 },
    );
  }

  const service = createServiceClient();

  // One live staged upload per researcher keeps the bucket tidy and makes
  // "re-upload a different file" behave the way it looks like it should.
  const { data: previous } = await service
    .from("staged_uploads")
    .select("id, storage_path")
    .eq("user_id", auth.user.id);

  const stale = (previous ?? []).filter((p) => p.storage_path !== path);
  if (stale.length) {
    await removeObjects(stale.map((p) => p.storage_path));
    await service
      .from("staged_uploads")
      .delete()
      .in("id", stale.map((p) => p.id));
  }

  const { data: staged, error: stageError } = await service
    .from("staged_uploads")
    .upsert(
      {
        user_id: auth.user.id,
        sha256_hash: sha256,
        storage_path: path,
        abstract: extraction.abstract,
        abstract_confidence: extraction.confidence,
        keywords: extraction.keywords,
        page_count: extraction.pageCount,
        size_bytes: bytes.byteLength,
        original_filename:
          typeof filename === "string" ? sanitizeTextInput(filename).slice(0, 200) : null,
      },
      { onConflict: "user_id,storage_path" },
    )
    .select("id")
    .single();

  if (stageError || !staged) {
    return Response.json(
      { error: "Could not stage the upload. Please try again." },
      { status: 500 },
    );
  }

  return Response.json(
    {
      stagedId: staged.id,
      sha256,
      abstract: extraction.abstract,
      keywords: extraction.keywords,
      confidence: extraction.confidence,
      pageCount: extraction.pageCount,
      sizeBytes: bytes.byteLength,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
