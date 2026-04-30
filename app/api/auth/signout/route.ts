import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sign-out is a POST route handler (rather than a Server Action) so the
// browser performs a normal form submission + 303 redirect. This sidesteps
// the fragile "clear-cookies + redirect" interaction that Server Actions
// have when the destination redirect re-renders the source layout/tree.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
