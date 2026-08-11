import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/constants";
import type { UserRole } from "@/lib/supabase/types";

export type AreaProfile = {
  id: string;
  full_name: string;
  role: UserRole;
};

/**
 * Server-side gate for the three role areas (/dashboard, /adviser, /admin).
 *
 * `proxy.ts` runs the same ladder at the edge, but it short-circuits server
 * actions and can be bypassed if the matcher ever drifts — so each layout
 * re-checks here. Returns the profile so layouts can render the user's name.
 */
export async function requireArea(role: UserRole): Promise<AreaProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, approval_status, is_active, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?error=deactivated");
  if (profile.approval_status === "pending") redirect("/pending");
  if (profile.approval_status === "rejected") redirect("/login?error=rejected");
  if (profile.approval_status === "revoked") redirect("/login?error=revoked");
  if (profile.role !== role) redirect(ROLE_HOME[profile.role]);

  return { id: profile.id, full_name: profile.full_name, role: profile.role };
}
