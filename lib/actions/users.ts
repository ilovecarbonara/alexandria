"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { requireLibrarian } from "./auth-guards";
import { logActivity } from "./activity";
import { validateUUID } from "@/lib/validation";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserApprovalStatus, UserRole } from "@/lib/supabase/types";

async function updateApprovalStatus(
  userId: string,
  approvalStatus: UserApprovalStatus,
  activity: string,
  allowedStatuses: UserApprovalStatus[],
  /** Approval also promotes `requested_role` into the live `role`. */
  promoteRequestedRole = false,
): Promise<{ error?: string }> {
  if (!validateUUID(userId)) return { error: "Invalid user ID format." };

  const auth = await requireLibrarian();
  if ("error" in auth) return { error: auth.error };

  if (userId === auth.user.id) {
    return { error: "You cannot change your own approval status." };
  }

  const service = createServiceClient();

  const { data: target, error: targetError } = await service
    .from("users")
    .select("approval_status, role, requested_role")
    .eq("id", userId)
    .single();

  if (targetError) return { error: targetError.message };
  if (!target) return { error: "Account not found." };
  if (target.role === "librarian") {
    return { error: "Librarian accounts cannot be changed here." };
  }
  if (!allowedStatuses.includes(target.approval_status)) {
    return { error: `User is already ${target.approval_status}.` };
  }

  const update: { approval_status: UserApprovalStatus; role?: UserRole } = {
    approval_status: approvalStatus,
  };
  if (promoteRequestedRole && target.requested_role !== "librarian") {
    update.role = target.requested_role;
  }

  const { error } = await service.from("users").update(update).eq("id", userId);

  if (error) return { error: error.message };

  const roleNote = update.role ? ` as ${ROLE_LABELS[update.role]}` : "";
  await logActivity(`${activity} ${userId}${roleNote}`);
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
    true,
  );
}

/**
 * Change a user's role after approval. The librarian role is seeded manually
 * and is neither grantable nor removable from the UI.
 */
export async function setUserRole(
  userId: string,
  role: UserRole,
): Promise<{ error?: string }> {
  if (!validateUUID(userId)) return { error: "Invalid user ID format." };
  if (role !== "student" && role !== "adviser") {
    return { error: "Only the student and research adviser roles can be assigned." };
  }

  const auth = await requireLibrarian();
  if ("error" in auth) return { error: auth.error };

  if (userId === auth.user.id) {
    return { error: "You cannot change your own role." };
  }

  const service = createServiceClient();

  const { data: target, error: targetError } = await service
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (targetError) return { error: targetError.message };
  if (!target) return { error: "Account not found." };
  if (target.role === "librarian") {
    return { error: "Librarian accounts cannot be changed here." };
  }
  if (target.role === role) {
    return { error: `User is already a ${ROLE_LABELS[role].toLowerCase()}.` };
  }

  // Reassigning an adviser away from the role would strand their queue.
  if (target.role === "adviser") {
    const { count } = await service
      .from("theses")
      .select("id", { count: "exact", head: true })
      .eq("adviser_id", userId)
      .eq("status", "pending_adviser");

    if (count && count > 0) {
      return {
        error: `This adviser has ${count} submission${count === 1 ? "" : "s"} awaiting review. Clear the queue before changing their role.`,
      };
    }
  }

  const { error } = await service
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };

  await logActivity(`Changed role to ${ROLE_LABELS[role]} for user ${userId}`);
  return {};
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

  const auth = await requireLibrarian();
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

  const auth = await requireLibrarian();
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
