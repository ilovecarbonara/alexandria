"use client";

import { useState } from "react";
import { Card, StatusChip, Button, Pagination, Select, ConfirmDialog } from "@/components/ui";
import {
  approveUser,
  rejectUser,
  revokeUser,
  deactivateUser,
  activateUser,
} from "@/lib/actions/users";
import { PAGE_SIZE } from "@/lib/constants";
import { generateCSV, downloadCSV } from "@/lib/export";
import type { UserApprovalStatus } from "@/lib/supabase/types";

type UserFilter = "all" | "pending" | "active" | "rejected" | "revoked" | "deactivated";
type UserStatus = Exclude<UserFilter, "all">;
type UserAction = "approve" | "reject" | "revoke" | "deactivate" | "activate";
type ConfirmAction = { userId: string; action: "deactivate" | "reject" | "revoke" };
type BulkAction = "approve" | "reject" | "revoke";

interface User {
  id: string;
  email: string;
  full_name: string;
  approval_status: UserApprovalStatus;
  is_active: boolean;
  last_active_at: string | null;
  created_at: string;
}

interface UserManagementClientProps {
  initialUsers: User[];
}

const filterOptions: { value: UserFilter; label: string }[] = [
  { value: "all", label: "All users" },
  { value: "pending", label: "Pending approval" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "revoked", label: "Revoked" },
  { value: "deactivated", label: "Deactivated" },
];

const confirmCopy: Record<ConfirmAction["action"], { title: string; message: string; label: string }> = {
  deactivate: {
    title: "Deactivate User",
    message: "This will suspend the user's account access immediately. Are you sure?",
    label: "Deactivate",
  },
  reject: {
    title: "Reject Request",
    message: "This will deny the user's registration request. They will see a rejection message when trying to log in.",
    label: "Reject",
  },
  revoke: {
    title: "Revoke Approval",
    message: "This will remove the user's approval. They will be redirected to login and see an approval-revoked message.",
    label: "Revoke",
  },
};

const bulkActionCopy: Record<BulkAction, { title: string; label: string; message: (count: number) => string }> = {
  approve: {
    title: "Bulk Approve Users",
    label: "Approve",
    message: (count) => `Approve ${count} selected user(s)? This will grant them access if their account is active.`,
  },
  reject: {
    title: "Bulk Reject Requests",
    label: "Reject",
    message: (count) => `Reject ${count} pending request(s)? These users will see a rejection message when trying to log in.`,
  },
  revoke: {
    title: "Bulk Revoke Approval",
    label: "Revoke",
    message: (count) => `Revoke approval for ${count} approved user(s)? These users will be redirected to login.`,
  },
};

export function UserManagementClient({
  initialUsers,
}: UserManagementClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<UserFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  function getStatus(user: User): UserStatus {
    if (!user.is_active) return "deactivated";
    if (user.approval_status === "approved") return "active";
    return user.approval_status;
  }

  const filtered = users.filter((user) => {
    if (filter === "all") return true;
    return getStatus(user) === filter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedUsers = users.filter((user) => selected.has(user.id));
  const selectedApprovableCount = selectedUsers.filter(
    (user) => user.approval_status !== "approved",
  ).length;
  const selectedPendingCount = selectedUsers.filter(
    (user) => user.approval_status === "pending",
  ).length;
  const selectedApprovedCount = selectedUsers.filter(
    (user) => user.approval_status === "approved",
  ).length;
  const activeConfirmCopy = confirmAction ? confirmCopy[confirmAction.action] : null;
  const bulkConfirmCopy = bulkAction ? bulkActionCopy[bulkAction] : null;
  const bulkTargetCount = bulkAction ? getBulkTargetUsers(bulkAction).length : 0;

  function getBulkTargetUsers(action: BulkAction) {
    if (action === "approve") {
      return selectedUsers.filter((user) => user.approval_status !== "approved");
    }
    if (action === "reject") {
      return selectedUsers.filter((user) => user.approval_status === "pending");
    }
    return selectedUsers.filter((user) => user.approval_status === "approved");
  }

  function getApprovalStatusAfterAction(action: "approve" | "reject" | "revoke"): UserApprovalStatus {
    if (action === "approve") return "approved";
    if (action === "reject") return "rejected";
    return "revoked";
  }

  function handleExportCSV() {
    const headers = ["Email", "Name", "Status", "Joined"];
    const rows = filtered.map((user) => [
      user.email,
      user.full_name,
      getStatus(user),
      new Date(user.created_at).toLocaleDateString(),
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV("users.csv", csv);
  }

  function toggleSelect(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAll() {
    const pageIds = paginated.map((user) => user.id);
    const allSelected = pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function executeBulkAction(action: BulkAction) {
    const targets = getBulkTargetUsers(action);
    if (targets.length === 0) {
      setError("No selected users are eligible for that action.");
      setBulkAction(null);
      return;
    }

    const ids = targets.map((user) => user.id);
    setBulkProgress({ current: 0, total: ids.length });
    setError(null);

    const actionFn = action === "approve" ? approveUser : action === "reject" ? rejectUser : revokeUser;
    const approvalStatus = getApprovalStatusAfterAction(action);

    for (let i = 0; i < ids.length; i++) {
      setBulkProgress({ current: i + 1, total: ids.length });
      const result = await actionFn(ids[i]);
      if (!result.error) {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === ids[i]
              ? { ...user, approval_status: approvalStatus }
              : user,
          ),
        );
      } else {
        setError(`Failed on user ${i + 1}: ${result.error}`);
        break;
      }
    }

    setSelected(new Set());
    setBulkProgress(null);
    setBulkAction(null);
  }

  async function handleAction(userId: string, action: UserAction) {
    if (acting) return;
    setActing(userId);
    setError(null);
    const actions = {
      approve: approveUser,
      reject: rejectUser,
      revoke: revokeUser,
      deactivate: deactivateUser,
      activate: activateUser,
    };
    const result = await actions[action](userId);
    if (!result.error) {
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== userId) return user;
          switch (action) {
            case "approve":
              return { ...user, approval_status: "approved" };
            case "reject":
              return { ...user, approval_status: "rejected" };
            case "revoke":
              return { ...user, approval_status: "revoked" };
            case "deactivate":
              return { ...user, is_active: false };
            case "activate":
              return { ...user, is_active: true };
            default:
              return user;
          }
        }),
      );
    } else {
      setError(result.error);
    }
    setActing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-white">User Management</h1>
          <p className="mt-1 font-mono text-sm text-white/40">
            Approve, reject, revoke, and manage user accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
          >
            Export CSV
          </Button>
          <div className="w-50">
            <Select
              placeholder="All users"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as UserFilter);
                setPage(1);
              }}
              options={filterOptions}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xs border border-dispute/30 bg-dispute/20 px-4 py-3 font-mono text-sm text-dispute">
          {error}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xs border border-accent/30 bg-accent/10 px-4 py-3">
          <span className="font-mono text-sm text-white/80">
            {bulkProgress
              ? `Processing ${bulkProgress.current} of ${bulkProgress.total}...`
              : `${selected.size} selected`}
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              className="text-xs"
              disabled={!!bulkProgress || selectedApprovableCount === 0}
              onClick={() => setBulkAction("approve")}
            >
              Approve Selected ({selectedApprovableCount})
            </Button>
            <Button
              variant="danger"
              className="text-xs"
              disabled={!!bulkProgress || selectedPendingCount === 0}
              onClick={() => setBulkAction("reject")}
            >
              Reject Pending ({selectedPendingCount})
            </Button>
            <Button
              variant="secondary"
              className="text-xs"
              disabled={!!bulkProgress || selectedApprovedCount === 0}
              onClick={() => setBulkAction("revoke")}
            >
              Revoke Approved ({selectedApprovedCount})
            </Button>
            <Button
              variant="secondary"
              className="text-xs"
              disabled={!!bulkProgress}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <Card className="p-0">
        {filtered.length === 0 ? (
          <p className="px-6 py-12 text-center font-mono text-sm text-white/40">
            No users found.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={paginated.length > 0 && paginated.every((user) => selected.has(user.id))}
                        onChange={toggleSelectAll}
                        className="cb"
                      />
                    </th>
                    <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                      Joined
                    </th>
                    <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                      Last Active
                    </th>
                    <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((user) => {
                    const status = getStatus(user);
                    const isActing = acting === user.id;
                    const isPending = user.approval_status === "pending";
                    const isApproved = user.approval_status === "approved";
                    const isRejected = user.approval_status === "rejected";
                    const isRevoked = user.approval_status === "revoked";

                    return (
                      <tr
                        key={user.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={selected.has(user.id)}
                            onChange={() => toggleSelect(user.id)}
                            className="cb"
                          />
                        </td>
                        <td className="max-w-40 truncate px-6 py-4 font-mono text-sm text-white/90">
                          {user.full_name}
                        </td>
                        <td className="max-w-48 truncate px-6 py-4 font-mono text-sm text-white/60">
                          {user.email}
                        </td>
                        <td className="px-6 py-4">
                          <StatusChip status={status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                          {user.last_active_at
                            ? new Date(user.last_active_at).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {user.is_active && isPending && (
                              <>
                                <Button
                                  className="text-xs"
                                  disabled={isActing}
                                  onClick={() => handleAction(user.id, "approve")}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  className="text-xs"
                                  disabled={isActing}
                                  onClick={() => setConfirmAction({ userId: user.id, action: "reject" })}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {user.is_active && isApproved && (
                              <>
                                <Button
                                  variant="danger"
                                  className="text-xs"
                                  disabled={isActing}
                                  onClick={() => setConfirmAction({ userId: user.id, action: "deactivate" })}
                                >
                                  Deactivate
                                </Button>
                                <Button
                                  variant="secondary"
                                  className="text-xs"
                                  disabled={isActing}
                                  onClick={() => setConfirmAction({ userId: user.id, action: "revoke" })}
                                >
                                  Revoke
                                </Button>
                              </>
                            )}
                            {user.is_active && isRejected && (
                              <Button
                                className="text-xs"
                                disabled={isActing}
                                onClick={() => handleAction(user.id, "approve")}
                              >
                                Approve
                              </Button>
                            )}
                            {user.is_active && isRevoked && (
                              <Button
                                className="text-xs"
                                disabled={isActing}
                                onClick={() => handleAction(user.id, "approve")}
                              >
                                Restore Approval
                              </Button>
                            )}
                            {!user.is_active && user.approval_status !== "approved" && (
                              <Button
                                className="text-xs"
                                disabled={isActing}
                                onClick={() => handleAction(user.id, "approve")}
                              >
                                {isRevoked ? "Restore Approval" : "Approve"}
                              </Button>
                            )}
                            {!user.is_active && (
                              <Button
                                className="text-xs"
                                disabled={isActing}
                                onClick={() => handleAction(user.id, "activate")}
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmAction}
        title={activeConfirmCopy?.title ?? "Confirm Action"}
        message={activeConfirmCopy?.message ?? "Are you sure?"}
        confirmLabel={activeConfirmCopy?.label ?? "Confirm"}
        variant="danger"
        onConfirm={() => {
          if (confirmAction) {
            handleAction(confirmAction.userId, confirmAction.action);
          }
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={!!bulkAction}
        title={bulkConfirmCopy?.title ?? "Bulk Action"}
        message={bulkConfirmCopy?.message(bulkTargetCount) ?? "Apply this action to selected users?"}
        confirmLabel={bulkConfirmCopy ? `${bulkConfirmCopy.label} (${bulkTargetCount})` : "Confirm"}
        variant={bulkAction === "approve" ? "primary" : "danger"}
        onConfirm={() => {
          if (bulkAction) executeBulkAction(bulkAction);
        }}
        onCancel={() => setBulkAction(null)}
      />
    </div>
  );
}
