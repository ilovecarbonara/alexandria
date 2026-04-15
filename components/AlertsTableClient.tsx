"use client";

import { useState, useMemo } from "react";
import { Card, StatusChip, Pagination, Select } from "@/components/ui";
import { DisputeButton } from "@/components/DisputeButton";
import { PAGE_SIZE } from "@/lib/constants";
import type { AlertStatus } from "@/lib/supabase/types";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Date (Newest)" },
  { value: "date-asc", label: "Date (Oldest)" },
  { value: "similarity-desc", label: "Similarity (Highest)" },
  { value: "similarity-asc", label: "Similarity (Lowest)" },
];

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
  title: string;
  subtitle: string;
  showNotifiedUser?: boolean;
  showDisputeAction?: boolean;
}

export function AlertsTableClient({
  alerts,
  title,
  subtitle,
  showNotifiedUser = false,
  showDisputeAction = false,
}: AlertsTableClientProps) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("date-desc");

  const sorted = useMemo(() => {
    const [field, direction] = sortKey.split("-") as [string, string];
    const copy = [...alerts];
    copy.sort((a, b) => {
      let cmp: number;
      if (field === "similarity") {
        cmp = a.similarityScore - b.similarityScore;
      } else {
        cmp =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [alerts, sortKey]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-white">{title}</h1>
          <p className="mt-1 font-mono text-sm text-white/40">{subtitle}</p>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-white/40">Sort by</span>
            <div className="w-56">
              <Select
                options={SORT_OPTIONS}
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}
      </div>

      <Card className="p-0">
        {alerts.length === 0 ? (
          <p className="py-8 text-center font-mono text-sm text-white/40">
            No title alerts found.
          </p>
        ) : (
          <>
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
                    <DisputeButton
                      thesisId={alert.newThesisId}
                      similarityContext={{
                        score: alert.similarityScore,
                        matchedThesisTitle: alert.matchedThesisTitle,
                      }}
                    />
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
          </>
        )}
      </Card>
    </div>
  );
}
