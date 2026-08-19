import { NextRequest } from "next/server";
import { requireResearcher } from "@/lib/actions/auth-guards";
import { createUploadTicket, stagingPath } from "@/lib/storage";
import { MAX_PDF_FILE_SIZE_BYTES, MAX_PDF_FILE_SIZE_MB } from "@/lib/constants";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Step 1 of 3 in the submission flow.
 *
 * Hands the browser a signed URL so the manuscript goes straight to Supabase
 * Storage. Routing a 25 MB file through this function would exceed the ~4.5 MB
 * serverless request body limit, so the file never touches our server on the
 * way in — only on the way back out, in /upload/process.
 *
 * The staging key is derived from a client-claimed hash purely as a filename.
 * Nothing trusts it: /upload/process recomputes the real SHA-256 from the
 * stored bytes.
 */
export async function POST(request: NextRequest) {
  const ip = await getClientIp();
  const ipLimit = await rateLimit(`upload-ticket-ip:${ip}`, {
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!ipLimit.success) {
    return Response.json(
      { error: "Too many uploads. Please try again later." },
      { status: 429 },
    );
  }

  const auth = await requireResearcher();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: 403 });
  }

  const rl = await rateLimit(`upload-ticket:${auth.user.id}`, {
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

  const { clientHash, sizeBytes } = (body ?? {}) as Record<string, unknown>;

  if (typeof clientHash !== "string" || !/^[a-f0-9]{64}$/i.test(clientHash)) {
    return Response.json({ error: "Invalid file reference." }, { status: 400 });
  }

  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return Response.json({ error: "Invalid file size." }, { status: 400 });
  }

  // Advisory only — Storage enforces the real ceiling via the bucket's
  // file_size_limit. This just fails fast before a doomed upload.
  if (sizeBytes > MAX_PDF_FILE_SIZE_BYTES) {
    return Response.json(
      { error: `The manuscript must be ${MAX_PDF_FILE_SIZE_MB} MB or smaller.` },
      { status: 400 },
    );
  }

  const path = stagingPath(auth.user.id, clientHash.toLowerCase());
  const ticket = await createUploadTicket(path);

  if ("error" in ticket) {
    return Response.json({ error: ticket.error }, { status: 500 });
  }

  return Response.json(ticket, {
    headers: { "Cache-Control": "no-store" },
  });
}
