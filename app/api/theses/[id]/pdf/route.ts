import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { openObjectStream } from "@/lib/storage";
import { validateUUID } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

/**
 * The only way a manuscript leaves the archive.
 *
 * Full text is restricted to the people with a stake in the document: the
 * submitter, any listed co-author matched to an account, the assigned adviser,
 * and the librarian. Everyone else — including signed-in researchers browsing the
 * registry — gets metadata and the abstract, and nothing more.
 *
 * The bytes are streamed through this handler rather than redirected to a
 * signed Storage URL, so authorization is re-checked on every single read and
 * there is no shareable link to leak.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!validateUUID(id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`pdf:${user.id}`, {
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!rl.success) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const service = createServiceClient();

  const { data: profile } = await service
    .from("users")
    .select("role, is_active, approval_status")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active || profile.approval_status !== "approved") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: thesis } = await service
    .from("theses")
    .select("id, user_id, adviser_id, pdf_path, title, thesis_authors(user_id)")
    .eq("id", id)
    .single();

  if (!thesis || !thesis.pdf_path) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const isCoAuthor = (thesis.thesis_authors ?? []).some(
    (a: { user_id: string | null }) => a.user_id === user.id,
  );

  const authorized =
    profile.role === "librarian" ||
    thesis.user_id === user.id ||
    thesis.adviser_id === user.id ||
    isCoAuthor;

  if (!authorized) {
    // Deliberately 403, not 404: the record itself is public, only its full
    // text is restricted, and saying so is clearer than pretending it is gone.
    return Response.json(
      { error: "You do not have access to the full text of this manuscript." },
      { status: 403 },
    );
  }

  const object = await openObjectStream(thesis.pdf_path);
  if ("error" in object) {
    return Response.json({ error: "Manuscript not found." }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(object.size),
      // Rendered in the in-page reader rather than downloaded. Same-origin
      // framing is permitted globally in next.config.ts, which this relies on.
      "Content-Disposition": "inline",
      // Never cached by a proxy, and never persisted to disk — the response is
      // authorized per-request and per-user.
      "Cache-Control": "private, no-store",
    },
  });
}
