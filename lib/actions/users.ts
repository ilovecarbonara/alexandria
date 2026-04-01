"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logActivity } from "./activity";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" as const };

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "Forbidden" as const };

  return { user };
}

export async function approveUser(
  userId: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const service = createServiceClient();
  const { error } = await service
    .from("users")
    .update({ is_approved: true })
    .eq("id", userId);

  if (error) return { error: error.message };

  await logActivity(`Approved user ${userId}`);
  return {};
}

export async function rejectUser(
  userId: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const service = createServiceClient();
  const { error } = await service
    .from("users")
    .update({ is_approved: false })
    .eq("id", userId);

  if (error) return { error: error.message };

  await logActivity(`Rejected user ${userId}`);
  return {};
}

export async function deactivateUser(
  userId: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  if (userId === auth.user.id) {
    return { error: "You cannot deactivate your own account." };
  }

  const service = createServiceClient();
  const { error } = await service
    .from("users")
    .update({ is_active: false })
    .eq("id", userId);

  if (error) return { error: error.message };

  await logActivity(`Deactivated user ${userId}`);
  return {};
}

export async function activateUser(
  userId: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const service = createServiceClient();
  const { error } = await service
    .from("users")
    .update({ is_active: true })
    .eq("id", userId);

  if (error) return { error: error.message };

  await logActivity(`Activated user ${userId}`);
  return {};
}
