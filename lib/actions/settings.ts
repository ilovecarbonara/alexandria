"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "./auth-guards";
import { validatePassword } from "@/lib/validation";

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ error?: string }> {
  if (!currentPassword) {
    return { error: "Current password is required." };
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) return { error: passwordError };

  const auth = await requireAuth();
  if ("error" in auth) return { error: auth.error };

  // Verify current password by attempting a sign-in
  const email = auth.user.email;
  if (!email) return { error: "Unable to verify identity." };

  const freshClient = await createClient();
  const { error: verifyError } = await freshClient.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verifyError) {
    return { error: "Current password is incorrect." };
  }

  const { error } = await auth.supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: error.message };
  }

  return {};
}
