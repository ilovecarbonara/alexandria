"use client";

import { useState } from "react";
import { Card, Modal, StatusChip, HashDisplay, Pagination, Select } from "@/components/ui";
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

const ExpandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
  </svg>
);

export function ThesisRegistryClient({
  initialTheses,
}: ThesisRegistryClientProps) {
  const [theses, setTheses] = useState(initialTheses);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<ThesisStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPage, setModalPage] = useState(1);

  const filtered = filter
    ? theses.filter((t) => t.status === filter)
    : theses;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const modalTotalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const modalPaginated = filtered.slice((modalPage - 1) * PAGE_SIZE, modalPage * PAGE_SIZE);

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

  const statusSelect = (thesis: Thesis) => (
    <Select
      value={thesis.status}
      disabled={updating === thesis.id}
      onChange={(e) =>
        handleStatusChange(thesis.id, e.target.value as ThesisStatus)
      }
      placeholder="Status"
      options={THESIS_STATUSES.map((s) => ({
        value: s.value,
        label: s.label,
      }))}
    />
  );

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
          <div className="w-44">
            <Select
              placeholder="All statuses"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as ThesisStatus | "");
                setPage(1);
              }}
              options={THESIS_STATUSES.map((s) => ({
                value: s.value,
                label: s.label,
              }))}
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
            No theses found.
          </p>
        ) : (
          <>
          {/* Expand button row */}
          <div className="flex items-center justify-end border-b border-border px-6 py-2">
            <button
              type="button"
              onClick={() => { setModalOpen(true); setModalPage(1); }}
              className="flex items-center gap-1.5 rounded-xs px-2 py-1 font-mono text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
              title="Expand table"
            >
              <ExpandIcon />
              <span>Expand</span>
            </button>
          </div>

          {/* Collapsed table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">Title</th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">Author</th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">Type</th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">Date</th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">Status</th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((thesis) => (
                  <tr key={thesis.id} className="border-b border-border last:border-b-0">
                    <td className="max-w-52 truncate px-6 py-4 font-mono text-sm text-white/90">
                      {thesis.title}
                    </td>
                    <td className="max-w-36 truncate px-6 py-4 font-mono text-sm text-white/60">
                      {thesis.author_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60 capitalize">
                      {thesis.submission_type}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                      {new Date(thesis.registered_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusChip status={thesis.status} />
                    </td>
                    <td className="px-6 py-4">
                      {statusSelect(thesis)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Expanded full-detail modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Thesis Registry — Full Details"
        className="w-[95vw] max-w-none"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Title</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Author</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Level</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Category</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Type</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Date</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">SHA-256</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Tx Hash</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Status</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modalPaginated.map((thesis) => (
                <tr key={thesis.id} className="border-b border-border last:border-b-0">
                  <td className="max-w-48 truncate px-4 py-3 font-mono text-sm text-white/90">
                    {thesis.title}
                  </td>
                  <td className="max-w-36 truncate px-4 py-3 font-mono text-sm text-white/60">
                    {thesis.author_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-white/60 capitalize">
                    {thesis.thesis_level}
                  </td>
                  <td className="max-w-36 truncate px-4 py-3 font-mono text-sm text-white/60">
                    {thesis.thesis_category}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-white/60 capitalize">
                    {thesis.submission_type}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-white/60">
                    {new Date(thesis.registered_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <HashDisplay hash={thesis.sha256_hash} />
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${thesis.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      <HashDisplay hash={thesis.tx_hash} />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={thesis.status} />
                  </td>
                  <td className="px-4 py-3">
                    {statusSelect(thesis)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2">
          <Pagination currentPage={modalPage} totalPages={modalTotalPages} onPageChange={setModalPage} />
        </div>
      </Modal>
    </div>
  );
}
