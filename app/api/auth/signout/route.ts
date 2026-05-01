import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// Sign-out is a POST route handler (rather than a Server Action) so the
// browser performs a normal form submission + 303 redirect. This sidesteps
// the fragile "clear-cookies + redirect" interaction that Server Actions
// have when the destination redirect re-renders the source layout/tree.
export async function POST(request: Request) {
  const ip = await getClientIp();
  const rl = rateLimit(`signout:${ip}`, { limit: 30, windowMs: 60 * 1000 });
  if (!rl.success) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
