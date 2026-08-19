import { NextRequest, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireResearcher } from "@/lib/actions/auth-guards";
import { isRegisteredOnChain, registerOnChain } from "@/lib/blockchain/actions";
import { checkTitleSimilarity } from "@/lib/similarity";
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
import { assertTransition } from "@/lib/workflow";

/**
 * Resubmission of a returned manuscript.
 *
 * The counterpart to /register for a thesis that already exists. The upload
 * half is shared — the browser stages the corrected PDF through
 * /upload/ticket and /upload/process exactly as it does for a new submission —
 * so this handler only has to swap the manuscript into the existing row and
 * push it back into the adviser's queue.
 *
 * Revising in place rather than inserting a new row is what makes
 * `revision_count` and `thesis_reviews.revision_number` line up: one thesis,
 * one review thread, however many attempts it took. The superseded manuscript
 * and its chain entry are replaced on the row; the old entry remains on chain,
 * simply no longer pointed at.
 *
 * The researcher may correct the title and the author list here, since a
 * return is often about exactly those. Level, category, and the assigned
 * adviser are fixed — changing the adviser mid-review would let a submission
 * walk away from the reviewer who returned it.
 */
export async function POST(request: NextRequest) {
  const ip = await getClientIp();
  const ipLimit = await rateLimit(`resubmit-ip:${ip}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!ipLimit.success) {
    return Response.json(
      { error: "Too many resubmissions. Please try again later." },
      { status: 429 },
    );
  }

  const auth = await requireResearcher();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: 403 });
  }

  const rl = await rateLimit(`resubmit:${auth.user.id}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.success) {
    return Response.json(
      { error: "Too many resubmissions. Please try again later." },
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

  const { thesisId, stagedId, title, authorNames } = body as Record<
    string,
    unknown
  >;

  if (
    typeof thesisId !== "string" ||
    typeof stagedId !== "string" ||
    typeof title !== "string" ||
    !title.trim() ||
    !Array.isArray(authorNames) ||
    !authorNames.every((name) => typeof name === "string")
  ) {
    return Response.json({ error: "All fields are required." }, { status: 400 });
  }

  if (!validateUUID(thesisId)) {
    return Response.json({ error: "Invalid submission reference." }, { status: 400 });
  }
  if (!validateUUID(stagedId)) {
    return Response.json({ error: "Invalid upload reference." }, { status: 400 });
  }

  const cleanTitle = sanitizeTextInput(title);
  const cleanAuthorNames = authorNames.map((name) => sanitizeTextInput(name));

  if (!cleanTitle || cleanAuthorNames.some((name) => !name)) {
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

  const service = createServiceClient();

  // --- The submission being revised ------------------------------------------

  const { data: thesis } = await service
    .from("theses")
    .select(
      "id, user_id, adviser_id, status, sha256_hash, pdf_path, revision_count, submission_type, thesis_level, thesis_category, thesis_authors(name, position)",
    )
    .eq("id", thesisId)
    .single();

  if (!thesis || thesis.user_id !== auth.user.id) {
    return Response.json({ error: "Submission not found." }, { status: 404 });
  }

  // The only transition a researcher owns: returned -> pending_adviser.
  const check = assertTransition(auth.profile.role, thesis.status, "pending_adviser");
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: 409 });
  }

  // A revision goes back to the adviser who returned it, so that account has to
  // still be able to receive it.
  if (!thesis.adviser_id) {
    return Response.json(
      { error: "This submission has no assigned adviser. Contact the university librarian." },
      { status: 409 },
    );
  }

  const { data: adviser } = await service
    .from("users")
    .select("id, role, is_active, approval_status")
    .eq("id", thesis.adviser_id)
    .single();

  if (
    !adviser ||
    adviser.role !== "adviser" ||
    !adviser.is_active ||
    adviser.approval_status !== "approved"
  ) {
    return Response.json(
      {
        error:
          "Your research adviser's account is no longer active. Contact the university librarian to be reassigned.",
      },
      { status: 409 },
    );
  }

  // --- The corrected manuscript ----------------------------------------------

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

  // A return means something had to change. /upload/process already refuses a
  // hash that is on chain, which covers this, but it reports it as a duplicate
  // registration — worth naming precisely for the person revising their own work.
  if (staged.sha256_hash === thesis.sha256_hash) {
    await removeObjects([staged.storage_path]);
    await service.from("staged_uploads").delete().eq("id", staged.id);
    return Response.json(
      {
        error:
          "This is the same manuscript you submitted before. Upload the corrected version.",
      },
      { status: 409 },
    );
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
      thesis.submission_type,
      thesis.thesis_level,
      thesis.thesis_category,
    );
    txHash = result.txHash;
    blockTimestamp = result.blockTimestamp;
  } catch (err) {
    console.error("Blockchain registration failed on resubmission:", err);
    return Response.json(
      { error: "Could not record the manuscript. Please try again." },
      { status: 500 },
    );
  }

  // --- Swap the manuscript in -------------------------------------------------

  const previousPdfPath = thesis.pdf_path;

  const { data: updated, error: updateError } = await service
    .from("theses")
    .update({
      title: cleanTitle,
      title_normalized: normalizeTitle(cleanTitle),
      abstract: staged.abstract,
      abstract_confidence: staged.abstract_confidence,
      abstract_extracted_at: new Date().toISOString(),
      // The abstract came out of a different PDF, so any correction a reviewer
      // made against the old one no longer describes this text.
      abstract_corrected_by: null,
      abstract_corrected_at: null,
      keywords: staged.keywords ?? [],
      sha256_hash: staged.sha256_hash,
      tx_hash: txHash,
      block_timestamp: new Date(blockTimestamp * 1000).toISOString(),
      pdf_size_bytes: staged.size_bytes,
      pdf_page_count: staged.page_count,
      status: "pending_adviser",
      revision_count: thesis.revision_count + 1,
    })
    .eq("id", thesis.id)
    // Guard against a reviewer acting on the submission while it was being revised.
    .eq("status", "returned")
    .select("id");

  if (updateError || !updated || updated.length === 0) {
    console.error("Resubmission save failed after blockchain registration:", {
      error: updateError,
      txHash,
      sha256: staged.sha256_hash,
      thesisId: thesis.id,
    });
    return Response.json(
      {
        error:
          "The manuscript was recorded but saving the revision failed. Contact the librarian with this transaction reference.",
        txHash,
      },
      { status: 500 },
    );
  }

  // --- Authors ----------------------------------------------------------------

  // Replaced only when the list actually changed: the refresh_authors_search
  // trigger recomputes theses.authors_search on every author row change, and a
  // delete-then-insert would blank it in between for no reason.
  const existingAuthors = (thesis.thesis_authors ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((a) => a.name);

  const authorsChanged =
    existingAuthors.length !== cleanAuthorNames.length ||
    existingAuthors.some((name, i) => name !== cleanAuthorNames[i]);

  if (authorsChanged) {
    // Mirrors register_thesis_with_authors: an author is linked to an account
    // when their name normalizes to an active user's, oldest account winning.
    // That link is what grants a co-author full-text access to the manuscript.
    const normalizedNames = cleanAuthorNames.map(normalizeNameForComparison);

    const { data: matchedUsers } = await service
      .from("users")
      .select("id, full_name_normalized, created_at")
      .in("full_name_normalized", normalizedNames)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    const accountByName = new Map<string, string>();
    for (const candidate of matchedUsers ?? []) {
      if (!accountByName.has(candidate.full_name_normalized)) {
        accountByName.set(candidate.full_name_normalized, candidate.id);
      }
    }

    await service.from("thesis_authors").delete().eq("thesis_id", thesis.id);

    const { error: authorInsertError } = await service
      .from("thesis_authors")
      .insert(
        cleanAuthorNames.map((name, index) => ({
          thesis_id: thesis.id,
          name,
          position: index + 1,
          user_id: accountByName.get(normalizeNameForComparison(name)) ?? null,
        })),
      );

    if (authorInsertError) {
      // The revision itself is already committed and in the adviser's queue;
      // losing the author rows would silently revoke co-author PDF access, so
      // this is worth surfacing rather than swallowing.
      console.error("Author list rewrite failed on resubmission:", {
        error: authorInsertError,
        thesisId: thesis.id,
      });
      return Response.json(
        {
          error:
            "Your revision was submitted, but the author list could not be updated. Contact the librarian.",
        },
        { status: 500 },
      );
    }
  }

  // --- Archive the corrected manuscript ---------------------------------------

  const finalPath = archivePath(thesis.id, staged.sha256_hash);
  const moved = await moveObject(staged.storage_path, finalPath);

  if (moved.error) {
    // The row is live but would point at nothing readable. Leave the manuscript
    // in staging and record that path rather than losing the file entirely.
    console.error("Could not move the revision into the archive:", moved.error);
    await service
      .from("theses")
      .update({ pdf_path: staged.storage_path })
      .eq("id", thesis.id);
  } else {
    await service
      .from("theses")
      .update({ pdf_path: finalPath })
      .eq("id", thesis.id);

    // Only once the row points at the new object is the old one safe to drop.
    if (previousPdfPath && previousPdfPath !== finalPath) {
      await removeObjects([previousPdfPath]);
    }
  }

  await service.from("staged_uploads").delete().eq("id", staged.id);

  await service.from("activity_logs").insert([
    {
      user_id: auth.user.id,
      action: `Revision ${thesis.revision_count + 1} submitted for adviser review`,
      thesis_id: thesis.id,
    },
    {
      user_id: thesis.adviser_id,
      action: "A revised submission is waiting in your queue",
      thesis_id: thesis.id,
    },
  ]);

  // Runs after the response is sent.
  after(async () => {
    try {
      await checkTitleSimilarity(thesis.id);
    } catch (err) {
      console.error("Similarity check failed after resubmission:", err);
    }
  });

  return Response.json({
    txHash,
    thesisId: thesis.id,
    revisionCount: thesis.revision_count + 1,
  });
}
