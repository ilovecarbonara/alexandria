import { createServiceClient } from "@/lib/supabase/service";
import { THESIS_BUCKET } from "@/lib/constants";

/**
 * Manuscript storage.
 *
 * The bucket is private and carries no RLS policies at all — every read is
 * streamed through GET /api/theses/[id]/pdf, which re-authorizes each request.
 * Uploads reach it only through a short-lived signed URL minted here, so a
 * 25 MB manuscript never passes through a serverless function body.
 */

/** Where a manuscript lives while the submission form is still being filled in. */
export function stagingPath(userId: string, sha256: string): string {
  return `staging/${userId}/${sha256}.pdf`;
}

/** Where it lives once the thesis row exists. */
export function archivePath(thesisId: string, sha256: string): string {
  return `archive/${thesisId}/${sha256}.pdf`;
}

/**
 * A one-shot upload URL for the browser. Supabase scopes the token to this
 * exact path, so a client cannot redirect the upload elsewhere in the bucket.
 */
export async function createUploadTicket(path: string): Promise<
  { url: string; token: string; path: string } | { error: string }
> {
  const service = createServiceClient();

  // An abandoned upload leaves an object behind; overwriting is how a student
  // retries the same file after a failed parse.
  const { data, error } = await service.storage
    .from(THESIS_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    return { error: error?.message ?? "Could not prepare the upload." };
  }

  return { url: data.signedUrl, token: data.token, path };
}

export async function downloadObject(
  path: string,
): Promise<{ data: Uint8Array } | { error: string }> {
  const service = createServiceClient();

  const { data, error } = await service.storage.from(THESIS_BUCKET).download(path);

  if (error || !data) {
    return { error: error?.message ?? "Could not read the uploaded file." };
  }

  return { data: new Uint8Array(await data.arrayBuffer()) };
}

/** Promotes a staged manuscript to its permanent path once the thesis exists. */
export async function moveObject(
  from: string,
  to: string,
): Promise<{ error?: string }> {
  const service = createServiceClient();
  const { error } = await service.storage.from(THESIS_BUCKET).move(from, to);
  return error ? { error: error.message } : {};
}

export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const service = createServiceClient();
  await service.storage.from(THESIS_BUCKET).remove(paths);
}

/**
 * Opens a manuscript for streaming. Callers must have authorized the request
 * first — this function performs no access control of its own.
 */
export async function openObjectStream(
  path: string,
): Promise<{ body: ReadableStream<Uint8Array>; size: number } | { error: string }> {
  const service = createServiceClient();

  const { data, error } = await service.storage.from(THESIS_BUCKET).download(path);

  if (error || !data) {
    return { error: error?.message ?? "Manuscript not found." };
  }

  return { body: data.stream() as ReadableStream<Uint8Array>, size: data.size };
}

/** SHA-256 of the bytes actually stored, as lowercase hex. */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
