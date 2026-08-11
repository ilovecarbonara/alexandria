import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateUUID, sanitizeTextInput, MAX_REASON_LENGTH } from "@/lib/validation";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Resolve a dispute. Body: { closing_note: string }.
 *
 * The closing note is appended as a final admin message in the thread, then
 * the dispute status flips to "resolved" (read-only). Both the flagger and
 * the thesis owner are notified via activity_logs.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = await getClientIp();
  const ipLimit = await rateLimit(`resolve-ip:${ip}`, {
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!ipLimit.success) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const { id } = await params;

  if (!validateUUID(id)) {
    return Response.json(
      { error: "Invalid dispute ID format." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "librarian" || !profile.is_active) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: 20 dispute resolutions per hour per librarian
  const rl = await rateLimit(`resolve:${user.id}`, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.success) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let body: { closing_note?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawNote = body.closing_note;
  if (typeof rawNote !== "string" || !rawNote.trim()) {
    return Response.json(
      { error: "Closing note is required." },
      { status: 400 },
    );
  }

  const closingNote = sanitizeTextInput(rawNote.trim());
  if (!closingNote) {
    return Response.json(
      { error: "Closing note is required." },
      { status: 400 },
    );
  }
  if (closingNote.length > MAX_REASON_LENGTH) {
    return Response.json(
      {
        error: `Closing note must be ${MAX_REASON_LENGTH} characters or less.`,
      },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  const { data: existing } = await service
    .from("disputes")
    .select("status, thesis_id, flagged_by")
    .eq("id", id)
    .single();

  if (!existing) {
    return Response.json({ error: "Dispute not found." }, { status: 404 });
  }

  if (existing.status === "resolved") {
    return Response.json(
      { error: "Dispute is already resolved." },
      { status: 409 },
    );
  }

  // 1) Append the closing message while the dispute is still open.
  const { error: msgError } = await service.from("dispute_messages").insert({
    dispute_id: id,
    author_id: user.id,
    author_role: "admin",
    body: closingNote,
  });

  if (msgError) {
    return Response.json({ error: msgError.message }, { status: 500 });
  }

  // 2) Flip status to resolved.
  const { error: updateError } = await service
    .from("disputes")
    .update({
      status: "resolved",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  // 3) Notifications + admin's own activity log.
  const { data: thesis } = await service
    .from("theses")
    .select("user_id, title")
    .eq("id", existing.thesis_id)
    .single();

  const truncatedTitle = thesis
    ? thesis.title.length > 80
      ? thesis.title.slice(0, 80) + "…"
      : thesis.title
    : "thesis";

  const logs: { user_id: string; action: string; thesis_id: string | null }[] = [
    {
      user_id: user.id,
      action: `Resolved dispute ${id}`,
      thesis_id: existing.thesis_id,
    },
    {
      user_id: existing.flagged_by,
      action: `Dispute you filed on "${truncatedTitle}" has been resolved`,
      thesis_id: existing.thesis_id,
    },
  ];

  if (thesis && thesis.user_id !== existing.flagged_by) {
    logs.push({
      user_id: thesis.user_id,
      action: `Dispute on your thesis "${truncatedTitle}" has been resolved`,
      thesis_id: existing.thesis_id,
    });
  }

  await service.from("activity_logs").insert(logs);

  // Mark the admin's read pointer so the closing note doesn't show as unread
  // on their own dashboard.
  await service.from("dispute_reads").upsert(
    {
      dispute_id: id,
      user_id: user.id,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "dispute_id,user_id" },
  );

  return Response.json({ success: true });
}
