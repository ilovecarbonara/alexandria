"use client";

import { useState } from "react";
import { Card, Modal, Field, StatusChip, HashDisplay, Pagination, Select } from "@/components/ui";
import { VersionTimeline } from "@/components/VersionTimeline";
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
  chainParticipantIds: string[];
}

export function ThesisRegistryClient({
  initialTheses,
  chainParticipantIds,
}: ThesisRegistryClientProps) {
  const [theses, setTheses] = useState(initialTheses);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<ThesisStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedThesis, setSelectedThesis] = useState<Thesis | null>(null);
  const chainParticipants = new Set(chainParticipantIds);

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
          {/* Table */}
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
                  <tr
                    key={thesis.id}
                    onClick={() => setSelectedThesis(thesis)}
                    className="cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-white/5"
                  >
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
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
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

      {/* Thesis detail modal */}
      <Modal
        open={!!selectedThesis}
        onClose={() => setSelectedThesis(null)}
        title="Thesis Details"
        className={selectedThesis && chainParticipants.has(selectedThesis.id) ? "min-w-[60vw]" : "min-w-[40vw]"}
      >
        {selectedThesis && (
          <div className="space-y-5">
            {chainParticipants.has(selectedThesis.id) ? (
              <div className="flex gap-6">
                <div className="min-w-0 flex-1 space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Title" value={selectedThesis.title} />
                    <Field label="Author" value={selectedThesis.author_name} />
                    {selectedThesis.user_email && (
                      <Field label="Email" value={selectedThesis.user_email} />
                    )}
                    <Field label="Level" value={selectedThesis.thesis_level} capitalize small />
                    <Field label="Category" value={selectedThesis.thesis_category} />
                    <Field label="Submission Type" value={selectedThesis.submission_type} capitalize small />
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs text-white/40">Status</span>
                      <StatusChip status={selectedThesis.status} />
                    </div>
                    <Field
                      label="Registered"
                      value={new Date(selectedThesis.registered_at).toLocaleString()}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs text-white/40">SHA-256 Hash</span>
                      <HashDisplay hash={selectedThesis.sha256_hash} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs text-white/40">Transaction</span>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${selectedThesis.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        <HashDisplay hash={selectedThesis.tx_hash} />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="w-64 shrink-0 border-l border-border pl-6 max-h-[60vh] overflow-y-auto">
                  <h3 className="mb-3 font-mono text-xs uppercase text-white/40 sticky top-0 bg-card pb-2">
                    Version History
                  </h3>
                  <VersionTimeline
                    thesisId={selectedThesis.id}
                    currentThesisId={selectedThesis.id}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Title" value={selectedThesis.title} />
                <Field label="Author" value={selectedThesis.author_name} />
                {selectedThesis.user_email && (
                  <Field label="Email" value={selectedThesis.user_email} />
                )}
                <Field label="Level" value={selectedThesis.thesis_level} capitalize small />
                <Field label="Category" value={selectedThesis.thesis_category} />
                <Field label="Submission Type" value={selectedThesis.submission_type} capitalize small />
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs text-white/40">Status</span>
                  <StatusChip status={selectedThesis.status} />
                </div>
                <Field
                  label="Registered"
                  value={new Date(selectedThesis.registered_at).toLocaleString()}
                />
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs text-white/40">SHA-256 Hash</span>
                  <HashDisplay hash={selectedThesis.sha256_hash} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs text-white/40">Transaction</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${selectedThesis.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    <HashDisplay hash={selectedThesis.tx_hash} />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
