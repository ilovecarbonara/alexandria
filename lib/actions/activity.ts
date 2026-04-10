"use server";

import { createClient } from "@/lib/supabase/server";
import { MAX_ACTIVITY_ACTION_LENGTH } from "@/lib/validation";

export async function logActivity(action: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const truncatedAction = action.slice(0, MAX_ACTIVITY_ACTION_LENGTH);

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action: truncatedAction,
  });
}
