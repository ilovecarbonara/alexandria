import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logActivity } from "@/lib/actions/activity";
import { validateUUID } from "@/lib/validation";
import { MAX_RESOLUTION_NOTES_LENGTH } from "@/lib/constants";

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
  const { error } = await service
    .from("disputes")
    .update({
      status,
      resolution_notes: resolution_notes.trim(),
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logActivity(`Resolved dispute ${id}`);

  return Response.json({ success: true });
}
