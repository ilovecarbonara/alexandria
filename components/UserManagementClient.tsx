"use client";

import { useState } from "react";
import { Card, StatusChip, Button, Pagination, Select, ConfirmDialog } from "@/components/ui";
import {
  approveUser,
  rejectUser,
  deactivateUser,
  activateUser,
} from "@/lib/actions/users";
import { PAGE_SIZE } from "@/lib/constants";
import { generateCSV, downloadCSV } from "@/lib/export";

interface User {
  id: string;
  email: string;
  full_name: string;
  is_approved: boolean;
  is_active: boolean;
  last_active_at: string | null;
  created_at: string;
}

interface UserManagementClientProps {
  initialUsers: User[];
}

export function UserManagementClient({
  initialUsers,
}: UserManagementClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "deactivated">("all");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: "deactivate" | "reject" } | null>(null);

  // Bulk selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const filtered = users.filter((u) => {
    if (filter === "pending") return !u.is_approved;
    if (filter === "active") return u.is_approved && u.is_active;
    if (filter === "deactivated") return !u.is_active;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function getStatus(user: User): "active" | "deactivated" | "pending" {
    if (!user.is_active) return "deactivated";
    if (!user.is_approved) return "pending";
    return "active";
  }

  function handleExportCSV() {
    const headers = ["Email", "Name", "Status", "Joined"];
    const rows = filtered.map((u) => [
      u.email,
      u.full_name,
      getStatus(u),
      new Date(u.created_at).toLocaleDateString(),
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
    const pageIds = paginated.map((u) => u.id);
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

  async function executeBulkAction(action: "approve" | "reject") {
    const ids = [...selected];
    setBulkProgress({ current: 0, total: ids.length });
    setError(null);

    const actionFn = action === "approve" ? approveUser : rejectUser;

    for (let i = 0; i < ids.length; i++) {
      setBulkProgress({ current: i + 1, total: ids.length });
      const result = await actionFn(ids[i]);
      if (!result.error) {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== ids[i]) return u;
            return action === "approve"
              ? { ...u, is_approved: true }
              : { ...u, is_approved: false };
          }),
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

  async function handleAction(
    userId: string,
    action: "approve" | "reject" | "deactivate" | "activate",
  ) {
    if (acting) return;
    setActing(userId);
    setError(null);
    const actions = { approve: approveUser, reject: rejectUser, deactivate: deactivateUser, activate: activateUser };
    const result = await actions[action](userId);
    if (!result.error) {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          switch (action) {
            case "approve":
              return { ...u, is_approved: true };
            case "reject":
              return { ...u, is_approved: false };
            case "deactivate":
              return { ...u, is_active: false };
            case "activate":
              return { ...u, is_active: true };
            default:
              return u;
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
            Approve, reject, and manage user accounts
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
                setFilter(e.target.value as typeof filter);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All users" },
                { value: "pending", label: "Pending approval" },
                { value: "active", label: "Active" },
                { value: "deactivated", label: "Deactivated" },
              ]}
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
              ? `Processing ${bulkProgress.current} of ${bulkProgress.total}…`
              : `${selected.size} selected`}
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              className="text-xs"
              disabled={!!bulkProgress}
              onClick={() => setBulkAction("approve")}
            >
              Approve Selected ({selected.size})
            </Button>
            <Button
              variant="danger"
              className="text-xs"
              disabled={!!bulkProgress}
              onClick={() => setBulkAction("reject")}
            >
              Reject Selected ({selected.size})
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
                      checked={paginated.length > 0 && paginated.every((u) => selected.has(u.id))}
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
                          {!user.is_approved && (
                            <Button
                              className="text-xs"
                              disabled={isActing}
                              onClick={() => handleAction(user.id, "approve")}
                            >
                              Approve
                            </Button>
                          )}
                          {user.is_approved && (
                            <Button
                              variant="secondary"
                              className="text-xs"
                              disabled={isActing}
                              onClick={() => setConfirmAction({ userId: user.id, action: "reject" })}
                            >
                              Reject
                            </Button>
                          )}
                          {user.is_active ? (
                            <Button
                              variant="danger"
                              className="text-xs"
                              disabled={isActing}
                              onClick={() => setConfirmAction({ userId: user.id, action: "deactivate" })}
                            >
                              Deactivate
                            </Button>
                          ) : (
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
        title={confirmAction?.action === "deactivate" ? "Deactivate User" : "Reject User"}
        message={
          confirmAction?.action === "deactivate"
            ? "This will revoke the user's access immediately. Are you sure?"
            : "This will revoke the user's approval. Are you sure?"
        }
        confirmLabel={confirmAction?.action === "deactivate" ? "Deactivate" : "Reject"}
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
        title={bulkAction === "approve" ? "Bulk Approve Users" : "Bulk Reject Users"}
        message={
          bulkAction === "approve"
            ? `Approve ${selected.size} selected user(s)? This will grant them access.`
            : `Reject ${selected.size} selected user(s)? This will revoke their approval.`
        }
        confirmLabel={bulkAction === "approve" ? `Approve (${selected.size})` : `Reject (${selected.size})`}
        variant={bulkAction === "reject" ? "danger" : "primary"}
        onConfirm={() => {
          if (bulkAction) executeBulkAction(bulkAction);
        }}
        onCancel={() => setBulkAction(null)}
      />
    </div>
  );
}
