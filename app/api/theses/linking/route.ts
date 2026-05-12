import { requireUser } from "@/lib/actions/auth-guards";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function GET() {
  const ip = await getClientIp();
  const ipLimit = await rateLimit(`thesis-linking-ip:${ip}`, {
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!ipLimit.success) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: noStoreHeaders },
    );
  }

  const auth = await requireUser();
  if ("error" in auth) {
    const status = auth.error === "Unauthorized" ? 401 : 403;
    return Response.json({ error: auth.error }, { status, headers: noStoreHeaders });
  }

  const { supabase, user } = auth;

  const userLimit = await rateLimit(`thesis-linking:${user.id}`, {
    limit: 120,
    windowMs: 60 * 1000,
  });

  if (!userLimit.success) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: noStoreHeaders },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return Response.json(
      { error: "Failed to load registration profile." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  const { data: drafts, error: draftsError } = await supabase
    .from("theses")
    .select("id, title, submission_type, registered_at")
    .eq("user_id", user.id)
    .eq("submission_type", "draft")
    .order("registered_at", { ascending: false });

  if (draftsError) {
    return Response.json(
      { error: "Failed to load revision options." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  const { data: linkedTheses, error: linkedError } = await supabase
    .from("theses")
    .select("previous_thesis_id")
    .eq("user_id", user.id)
    .not("previous_thesis_id", "is", null);

  if (linkedError) {
    return Response.json(
      { error: "Failed to load revision options." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  const parentIds = new Set(
    (linkedTheses ?? []).map((thesis) => thesis.previous_thesis_id),
  );
  const linkableTheses = (drafts ?? []).filter((draft) => !parentIds.has(draft.id));

  return Response.json({
    fullName: profile.full_name,
    linkableTheses,
  }, { headers: noStoreHeaders });
}