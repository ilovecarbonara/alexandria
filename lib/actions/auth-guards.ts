import { createClient } from "@/lib/supabase/server";
import type { UserApprovalStatus, UserRole } from "@/lib/supabase/types";

type AuthSuccess = {
  user: { id: string; email?: string };
  profile: {
    approval_status: UserApprovalStatus;
    is_active: boolean;
    role: UserRole;
    full_name: string;
  };
  supabase: Awaited<ReturnType<typeof createClient>>;
};

type AuthFailure = { error: string };

type AuthResult = AuthSuccess | AuthFailure;

/**
 * Authenticated, approved, and active. The base every other guard builds on.
 *
 * Note that `proxy.ts` short-circuits server actions, so these guards — not the
 * middleware — are what actually protect action and route-handler calls.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("approval_status, is_active, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Account not found." };

  if (!profile.is_active) return { error: "Account deactivated." };

  if (profile.approval_status === "pending") {
    return { error: "Account not yet approved." };
  }

  if (profile.approval_status === "rejected") {
    return { error: "Account request rejected." };
  }

  if (profile.approval_status === "revoked") {
    return { error: "Account approval revoked." };
  }

  return { user, profile, supabase };
}

/** Authenticated and holding one of the given roles. */
export async function requireRole(
  ...roles: UserRole[]
): Promise<AuthResult> {
  const result = await requireAuth();
  if ("error" in result) return result;

  if (!roles.includes(result.profile.role)) return { error: "Forbidden" };

  return result;
}

/** Only researchers submit theses, file disputes, and receive title alerts. */
export function requireResearcher(): Promise<AuthResult> {
  return requireRole("researcher");
}

export function requireAdviser(): Promise<AuthResult> {
  return requireRole("adviser");
}

/** The librarian — the account previously modelled as `is_admin`. */
export function requireLibrarian(): Promise<AuthResult> {
  return requireRole("librarian");
}

/** Either reviewing role: both see manuscripts and act on the pipeline. */
export function requireReviewer(): Promise<AuthResult> {
  return requireRole("adviser", "librarian");
}
