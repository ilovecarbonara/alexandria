"use server";

import { createClient } from "@/lib/supabase/server";

export async function changePassword(
  newPassword: string,
): Promise<{ error?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: error.message };
  }

  return {};
}
