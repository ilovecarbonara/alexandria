"use client";

import { useState } from "react";
import { Card, StatusChip, Button, Pagination, Select } from "@/components/ui";
import { PAGE_SIZE } from "@/lib/constants";
interface Dispute {
  id: string;
  reason: string;
  status: "open" | "resolved";
  created_at: string;
  thesis_title: string;
  flagged_by_name: string;
}

interface DisputeManagementClientProps {
  initialDisputes: Dispute[];
}

export function DisputeManagementClient({
  initialDisputes,
}: DisputeManagementClientProps) {
  const [disputes, setDisputes] = useState(initialDisputes);
  const [resolving, setResolving] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filtered = filter === "all" ? disputes : disputes.filter((d) => d.status === filter);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleResolve(disputeId: string) {
    setResolving(disputeId);
    setError(null);
    const res = await fetch(`/api/disputes/${disputeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });

    if (res.ok) {
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === disputeId ? { ...d, status: "resolved" as const } : d,
        ),
      );
    } else {
      setError("Failed to resolve dispute. Please try again.");
    }
    setResolving(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-white">
            Dispute Management
          </h1>
          <p className="mt-1 font-mono text-sm text-white/40">
            Review and resolve flagged disputes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-44">
            <Select
              placeholder="All"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as typeof filter);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All" },
                { value: "open", label: "Open" },
                { value: "resolved", label: "Resolved" },
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

      <Card className="p-0">
        {filtered.length === 0 ? (
          <p className="px-6 py-12 text-center font-mono text-sm text-white/40">
            No disputes found.
          </p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Thesis
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Flagged By
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Reason
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((dispute) => (
                  <tr
                    key={dispute.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="max-w-48 truncate px-6 py-4 font-mono text-sm text-white/90">
                      {dispute.thesis_title}
                    </td>
                    <td className="max-w-36 truncate px-6 py-4 font-mono text-sm text-white/60">
                      {dispute.flagged_by_name}
                    </td>
                    <td className="max-w-64 truncate px-6 py-4 font-mono text-sm text-white/60">
                      {dispute.reason}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                      {new Date(dispute.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusChip status={dispute.status} />
                    </td>
                    <td className="px-6 py-4">
                      {dispute.status === "open" ? (
                        <Button
                          className="text-xs"
                          disabled={resolving === dispute.id}
                          onClick={() => handleResolve(dispute.id)}
                        >
                          {resolving === dispute.id
                            ? "Resolving…"
                            : "Resolve"}
                        </Button>
                      ) : (
                        <span className="font-mono text-xs text-white/30">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}
