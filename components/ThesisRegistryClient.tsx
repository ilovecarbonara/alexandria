"use client";

import { useState } from "react";
import { Card, StatusChip, HashDisplay, Button, Pagination } from "@/components/ui";
import { updateThesisStatus } from "@/lib/actions/theses";
import { THESIS_STATUSES, PAGE_SIZE } from "@/lib/constants";
import type { ThesisStatus } from "@/lib/supabase/types";

interface Thesis {
  id: string;
  title: string;
  author_name: string;
  thesis_level: string;
  thesis_category: string;
  submission_type: string;
  sha256_hash: string;
  tx_hash: string;
  status: ThesisStatus;
  registered_at: string;
  user_email?: string;
}

interface ThesisRegistryClientProps {
  initialTheses: Thesis[];
}

export function ThesisRegistryClient({
  initialTheses,
}: ThesisRegistryClientProps) {
  const [theses, setTheses] = useState(initialTheses);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<ThesisStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filtered = filter
    ? theses.filter((t) => t.status === filter)
    : theses;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleStatusChange(thesisId: string, newStatus: ThesisStatus) {
    setUpdating(thesisId);
    setError(null);
    const result = await updateThesisStatus(thesisId, newStatus);
    if (!result.error) {
      setTheses((prev) =>
        prev.map((t) => (t.id === thesisId ? { ...t, status: newStatus } : t)),
      );
    } else {
      setError(result.error);
    }
    setUpdating(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-white">Thesis Registry</h1>
          <p className="mt-1 font-mono text-sm text-white/40">
            Manage thesis registrations and statuses
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="font-mono text-xs text-white/40">Filter:</label>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as ThesisStatus | "");
              setPage(1);
            }}
            className="rounded-xs border border-border bg-surface px-3 py-1.5 font-mono text-sm text-white/90 focus:border-accent focus:outline-none"
          >
            <option value="">All statuses</option>
            {THESIS_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
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
            No theses found.
          </p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Title
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Author
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Level
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Tx Hash
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
                {paginated.map((thesis) => (
                  <tr
                    key={thesis.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="max-w-48 truncate px-6 py-4 font-mono text-sm text-white/90">
                      {thesis.title}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-white/60">
                      {thesis.author_name}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-white/60 capitalize">
                      {thesis.thesis_level}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-white/60">
                      {thesis.thesis_category}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-white/60 capitalize">
                      {thesis.submission_type}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                      {new Date(thesis.registered_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${thesis.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        <HashDisplay hash={thesis.tx_hash} />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <StatusChip status={thesis.status} />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={thesis.status}
                        disabled={updating === thesis.id}
                        onChange={(e) =>
                          handleStatusChange(
                            thesis.id,
                            e.target.value as ThesisStatus,
                          )
                        }
                        className="rounded-xs border border-border bg-surface px-2 py-1 font-mono text-xs text-white/90 focus:border-accent focus:outline-none disabled:opacity-50"
                      >
                        {THESIS_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
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
