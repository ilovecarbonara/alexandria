import { requireResearcher } from "@/lib/actions/auth-guards";
import { createServiceClient } from "@/lib/supabase/service";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

/**
 * Records that the researcher affirmed the publication notice and asked not to
 * be shown it again.
 *
 * Written through the service client rather than the caller's client because
 * `public.users` has no self-update RLS policy, and adding one would be a wide
 * hole: an UPDATE policy on the row would also let the account rewrite its own
 * `role`. The write here is pinned to the authenticated caller's id and touches
 * exactly one column.
 */
export async function POST() {
  const ip = await getClientIp();
  const ipLimit = await rateLimit(`publication-notice-ip:${ip}`, {
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!ipLimit.success) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: noStoreHeaders },
    );
  }

  const auth = await requireResearcher();
  if ("error" in auth) {
    const status = auth.error === "Unauthorized" ? 401 : 403;
    return Response.json({ error: auth.error }, { status, headers: noStoreHeaders });
  }

  const { user } = auth;

  const userLimit = await rateLimit(`publication-notice:${user.id}`, {
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!userLimit.success) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: noStoreHeaders },
    );
  }

  const service = createServiceClient();
  const { error } = await service
    .from("users")
    .update({ publication_notice_ack_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return Response.json(
      { error: "Could not save your preference." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  return Response.json({ ok: true }, { headers: noStoreHeaders });
}
