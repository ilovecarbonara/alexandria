"use server";

import { requireAuth } from "./auth-guards";

export async function changePassword(
  newPassword: string,
): Promise<{ error?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const auth = await requireAuth();
  if ("error" in auth) return { error: auth.error };

  const { error } = await auth.supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: error.message };
  }

  return {};
}
