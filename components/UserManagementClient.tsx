"use client";

import { useState } from "react";
import { Card, StatusChip, Button } from "@/components/ui";
import {
  approveUser,
  rejectUser,
  deactivateUser,
  activateUser,
} from "@/lib/actions/users";

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

  const filtered = users.filter((u) => {
    if (filter === "pending") return !u.is_approved;
    if (filter === "active") return u.is_approved && u.is_active;
    if (filter === "deactivated") return !u.is_active;
    return true;
  });

  function getStatus(user: User): "active" | "deactivated" | "pending" {
    if (!user.is_active) return "deactivated";
    if (!user.is_approved) return "pending";
    return "active";
  }

  async function handleAction(
    userId: string,
    action: "approve" | "reject" | "deactivate" | "activate",
  ) {
    setActing(userId);
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
          <label className="font-mono text-xs text-white/40">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="rounded-xs border border-border bg-surface px-3 py-1.5 font-mono text-sm text-white/90 focus:border-accent focus:outline-none"
          >
            <option value="all">All users</option>
            <option value="pending">Pending approval</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      <Card className="p-0">
        {filtered.length === 0 ? (
          <p className="px-6 py-12 text-center font-mono text-sm text-white/40">
            No users found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
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
                {filtered.map((user) => {
                  const status = getStatus(user);
                  const isActing = acting === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-6 py-4 font-mono text-sm text-white/90">
                        {user.full_name}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-white/60">
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
                              onClick={() => handleAction(user.id, "reject")}
                            >
                              Reject
                            </Button>
                          )}
                          {user.is_active ? (
                            <Button
                              variant="danger"
                              className="text-xs"
                              disabled={isActing}
                              onClick={() =>
                                handleAction(user.id, "deactivate")
                              }
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
        )}
      </Card>
    </div>
  );
}
