"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "./auth-guards";
import { logActivity } from "./activity";

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
