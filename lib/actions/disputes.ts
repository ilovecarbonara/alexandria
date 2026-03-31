"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activity";

export async function flagDispute(
  thesisId: string,
  reason: string,
): Promise<{ error?: string }> {
  if (!thesisId || !reason?.trim()) {
    return { error: "Thesis ID and reason are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase.from("disputes").insert({
    thesis_id: thesisId,
    flagged_by: user.id,
    reason: reason.trim(),
  });

  if (error) {
    return { error: error.message };
  }

  await logActivity("Dispute filed");

  return {};
}
