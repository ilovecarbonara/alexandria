import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateUUID, sanitizeTextInput } from "@/lib/validation";
import { MAX_RESOLUTION_NOTES_LENGTH } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!validateUUID(id)) {
    return Response.json({ error: "Invalid dispute ID format." }, { status: 400 });
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
    .select("is_admin, is_active")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin || !profile.is_active) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: 20 dispute resolutions per hour per admin
  const rl = rateLimit(`resolve:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!rl.success) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let body: { status?: string; resolution_notes?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { status, resolution_notes } = body;

  if (status !== "resolved") {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  if (
    typeof resolution_notes !== "string" ||
    !resolution_notes.trim() ||
    resolution_notes.length > MAX_RESOLUTION_NOTES_LENGTH
  ) {
    return Response.json(
      { error: "Resolution notes are required (max 2000 characters)." },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  const { data: existing } = await service
    .from("disputes")
    .select("status")
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

  const { error } = await service
    .from("disputes")
    .update({
      status,
      resolution_notes: sanitizeTextInput(resolution_notes.trim()),
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Notify the thesis owner about the resolution
  const { data: dispute } = await service
    .from("disputes")
    .select("thesis_id")
    .eq("id", id)
    .single();

  // Log admin's resolution activity (with thesis_id when available)
  await service.from("activity_logs").insert({
    user_id: user.id,
    action: `Resolved dispute ${id}`,
    thesis_id: dispute?.thesis_id ?? null,
  });

  if (dispute) {
    const { data: thesis } = await service
      .from("theses")
      .select("user_id, title")
      .eq("id", dispute.thesis_id)
      .single();

    if (thesis) {
      const truncatedTitle =
        thesis.title.length > 80
          ? thesis.title.slice(0, 80) + "…"
          : thesis.title;

      await service.from("activity_logs").insert({
        user_id: thesis.user_id,
        action: `Dispute on your thesis "${truncatedTitle}" has been resolved`,
        thesis_id: dispute.thesis_id,
      });
    }
  }

  return Response.json({ success: true });
}
