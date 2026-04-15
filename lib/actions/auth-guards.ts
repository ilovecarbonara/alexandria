import { createClient } from "@/lib/supabase/server";

type AuthSuccess = {
  user: { id: string; email?: string };
  profile: { is_approved: boolean; is_active: boolean; is_admin: boolean };
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
    .select("is_approved, is_active, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Account not found." };

  if (!profile.is_active) return { error: "Account deactivated." };

  if (!profile.is_approved) return { error: "Account not yet approved." };

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
