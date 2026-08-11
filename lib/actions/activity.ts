"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireLibrarian } from "./auth-guards";
import { MAX_ACTIVITY_ACTION_LENGTH } from "@/lib/validation";
import { validateUUID } from "@/lib/validation";

export async function logActivity(action: string, thesisId?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const truncatedAction = action.slice(0, MAX_ACTIVITY_ACTION_LENGTH);

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action: truncatedAction,
    thesis_id: thesisId ?? null,
  });
}

export async function getThesisActivityLogs(thesisId: string): Promise<{
  error?: string;
  data?: { id: string; action: string; created_at: string; user_name: string }[];
}> {
  if (!validateUUID(thesisId)) {
    return { error: "Invalid thesis ID format." };
  }

  const auth = await requireLibrarian();
  if ("error" in auth) return { error: auth.error };

  const service = createServiceClient();

  const { data, error } = await service
    .from("activity_logs")
    .select("id, action, created_at, user_id")
    .eq("thesis_id", thesisId)
    .order("created_at", { ascending: false });

  if (error) return { error: "Failed to load activity history." };

  if (!data || data.length === 0) return { data: [] };

  const userIds = [...new Set(data.map((l) => l.user_id))];
  const { data: users } = await service
    .from("users")
    .select("id, full_name")
    .in("id", userIds);

  const nameMap = new Map(
    (users ?? []).map((u: { id: string; full_name: string }) => [u.id, u.full_name]),
  );

  return {
    data: data.map((l) => ({
      id: l.id,
      action: l.action,
      created_at: l.created_at,
      user_name: nameMap.get(l.user_id) ?? "Unknown",
    })),
  };
}
