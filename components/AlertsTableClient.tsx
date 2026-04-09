"use client";

import { useState } from "react";
import { Card, StatusChip, Pagination } from "@/components/ui";
import { DisputeButton } from "@/components/DisputeButton";
import { PAGE_SIZE } from "@/lib/constants";
import type { AlertStatus } from "@/lib/supabase/types";

interface AlertRow {
  id: string;
  newThesisTitle: string;
  matchedThesisTitle: string;
  notifiedUserName?: string;
  newThesisId: string;
  similarityScore: number;
  status: AlertStatus;
  createdAt: string;
}

interface AlertsTableClientProps {
  alerts: AlertRow[];
  showNotifiedUser?: boolean;
  showDisputeAction?: boolean;
}

export function AlertsTableClient({
  alerts,
  showNotifiedUser = false,
  showDisputeAction = false,
}: AlertsTableClientProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(alerts.length / PAGE_SIZE);
  const paginated = alerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (alerts.length === 0) {
    return (
      <Card>
        <p className="py-8 text-center font-mono text-sm text-white/40">
          No title alerts found.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                New Thesis
              </th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                Matched Thesis
              </th>
              {showNotifiedUser && (
                <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                  Notified User
                </th>
              )}
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                Similarity
              </th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                Status
              </th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                Date
              </th>
              {showDisputeAction && (
                <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginated.map((alert) => (
              <tr
                key={alert.id}
                className="border-b border-border last:border-b-0"
              >
                <td className="max-w-48 truncate px-6 py-4 font-mono text-sm text-white/90">
                  {alert.newThesisTitle}
                </td>
                <td className="max-w-48 truncate px-6 py-4 font-mono text-sm text-white/90">
                  {alert.matchedThesisTitle}
                </td>
                {showNotifiedUser && (
                  <td className="max-w-36 truncate px-6 py-4 font-mono text-sm text-white/60">
                    {alert.notifiedUserName ?? "Unknown"}
                  </td>
                )}
                <td className="px-6 py-4 font-mono text-sm text-hash">
                  {(alert.similarityScore * 100).toFixed(1)}%
                </td>
                <td className="px-6 py-4">
                  <StatusChip status={alert.status} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                  {new Date(alert.createdAt).toLocaleDateString()}
                </td>
                {showDisputeAction && (
                  <td className="px-6 py-4">
                    <DisputeButton thesisId={alert.newThesisId} />
                  </td>
                )}
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
    </Card>
  );
}
