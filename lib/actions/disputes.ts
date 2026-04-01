"use server";

import { requireAuth } from "./auth-guards";
import { logActivity } from "./activity";
import { MAX_REASON_LENGTH } from "@/lib/validation";

export async function flagDispute(
  thesisId: string,
  reason: string,
): Promise<{ error?: string }> {
  if (!thesisId || !reason?.trim()) {
    return { error: "Thesis ID and reason are required." };
  }

  if (reason.trim().length > MAX_REASON_LENGTH) {
    return { error: `Reason must be ${MAX_REASON_LENGTH} characters or less.` };
  }

  const auth = await requireAuth();
  if ("error" in auth) return { error: auth.error };

  // Prevent self-flagging
  const { data: thesis } = await auth.supabase
    .from("theses")
    .select("user_id")
    .eq("id", thesisId)
    .single();

  if (!thesis) return { error: "Thesis not found." };
  if (thesis.user_id === auth.user.id) {
    return { error: "You cannot flag your own thesis." };
  }

  const { error } = await auth.supabase.from("disputes").insert({
    thesis_id: thesisId,
    flagged_by: auth.user.id,
    reason: reason.trim(),
  });

  if (error) {
    return { error: error.message };
  }

  await logActivity("Dispute filed");

  return {};
}
