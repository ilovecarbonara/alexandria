"use server";

import { createClient } from "@/lib/supabase/server";

export async function logActivity(action: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action,
  });
}
