import { createClient } from "@/lib/supabase/server";
import type { UserApprovalStatus } from "@/lib/supabase/types";

type AuthSuccess = {
  user: { id: string; email?: string };
  profile: { approval_status: UserApprovalStatus; is_active: boolean; is_admin: boolean };
  supabase: Awaited<ReturnType<typeof createClient>>;
};

type AuthFailure = { error: string };

type AuthResult = AuthSuccess | AuthFailure;

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("approval_status, is_active, is_admin")
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

export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireAuth();
  if ("error" in result) return result;

  if (!result.profile.is_admin) return { error: "Forbidden" };

  return result;
}

export async function requireUser(): Promise<AuthResult> {
  const result = await requireAuth();
  if ("error" in result) return result;

  if (result.profile.is_admin) return { error: "Forbidden" };

  return result;
}
