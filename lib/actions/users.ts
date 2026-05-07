"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "./auth-guards";
import { logActivity } from "./activity";
import { validateUUID } from "@/lib/validation";
import type { UserApprovalStatus } from "@/lib/supabase/types";

async function updateApprovalStatus(
  userId: string,
  approvalStatus: UserApprovalStatus,
  activity: string,
  allowedStatuses: UserApprovalStatus[],
): Promise<{ error?: string }> {
  if (!validateUUID(userId)) return { error: "Invalid user ID format." };

  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  if (userId === auth.user.id) {
    return { error: "You cannot change your own approval status." };
  }

  const service = createServiceClient();

  const { data: target, error: targetError } = await service
    .from("users")
    .select("approval_status, is_admin")
    .eq("id", userId)
    .single();

  if (targetError) return { error: targetError.message };
  if (!target) return { error: "Account not found." };
  if (target.is_admin) return { error: "Admin accounts cannot be changed here." };
  if (!allowedStatuses.includes(target.approval_status)) {
    return { error: `User is already ${target.approval_status}.` };
  }

  const { error } = await service
    .from("users")
    .update({ approval_status: approvalStatus })
    .eq("id", userId);

  if (error) return { error: error.message };

  await logActivity(`${activity} ${userId}`);
  return {};
}

export async function approveUser(
  userId: string,
): Promise<{ error?: string }> {
  return updateApprovalStatus(
    userId,
    "approved",
    "Approved user",
    ["pending", "rejected", "revoked"],
  );
}

export async function rejectUser(
  userId: string,
): Promise<{ error?: string }> {
  return updateApprovalStatus(
    userId,
    "rejected",
    "Rejected registration request for user",
    ["pending"],
  );
}

export async function revokeUser(
  userId: string,
): Promise<{ error?: string }> {
  return updateApprovalStatus(
    userId,
    "revoked",
    "Revoked approval for user",
    ["approved"],
  );
}

export async function deactivateUser(
  userId: string,
): Promise<{ error?: string }> {
  if (!validateUUID(userId)) return { error: "Invalid user ID format." };

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
  if (!validateUUID(userId)) return { error: "Invalid user ID format." };

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
