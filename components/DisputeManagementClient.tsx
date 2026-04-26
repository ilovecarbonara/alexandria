"use client";

import { useState } from "react";
import {
  Card,
  StatusChip,
  Button,
  Pagination,
  Select,
  Modal,
  ConfirmDialog,
} from "@/components/ui";
import { PAGE_SIZE, THESIS_LEVELS } from "@/lib/constants";
import { MAX_REASON_LENGTH } from "@/lib/validation";
import { generateCSV, downloadCSV } from "@/lib/export";

interface Dispute {
  id: string;
  /** Body of the opening (flagger) message in the dispute thread. */
  opening_message: string;
  status: "open" | "resolved";
  created_at: string;
  thesis_title: string;
  thesis_author_name: string;
  thesis_level: string | null;
  thesis_category: string | null;
  thesis_registered_at: string | null;
  flagged_by_name: string;
  /** Body of the admin's closing message (only present once resolved). */
  closing_note: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
}

interface DisputeManagementClientProps {
  initialDisputes: Dispute[];
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-xs text-white/40">{label}</span>
      <span className="font-mono text-sm text-white/90">{value}</span>
    </div>
  );
}

function formatThesisLevel(level: string | null): string {
  if (!level) return "—";
  return THESIS_LEVELS.find((l) => l.value === level)?.label ?? level;
}

export function DisputeManagementClient({
  initialDisputes,
}: DisputeManagementClientProps) {
  const [disputes, setDisputes] = useState(initialDisputes);
  const [resolving, setResolving] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [confirmResolve, setConfirmResolve] = useState(false);

  const filtered =
    filter === "all" ? disputes : disputes.filter((d) => d.status === filter);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openModal(dispute: Dispute) {
    setSelectedDispute(dispute);
    setResolutionNotes("");
    setError(null);
  }

  function handleExportCSV() {
    const headers = ["Thesis", "Flagged By", "Reason", "Status", "Date"];
    const rows = filtered.map((d) => [
      d.thesis_title,
      d.flagged_by_name,
      d.opening_message,
      d.status,
      new Date(d.created_at).toLocaleDateString(),
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV("disputes.csv", csv);
  }

  function closeModal() {
    setSelectedDispute(null);
    setResolutionNotes("");
  }

  async function handleResolve() {
    if (!selectedDispute || resolving) return;
    setResolving(selectedDispute.id);
    setError(null);
    const res = await fetch(`/api/disputes/${selectedDispute.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        closing_note: resolutionNotes,
      }),
    });

    if (res.ok) {
      const now = new Date().toISOString();
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === selectedDispute.id
            ? {
                ...d,
                status: "resolved" as const,
                closing_note: resolutionNotes.trim(),
                resolved_at: now,
                resolved_by_name: "You",
              }
            : d,
        ),
      );
      closeModal();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to resolve dispute. Please try again.");
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
          <Button
            variant="secondary"
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
          >
            Export CSV
          </Button>
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
                    <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                      Thesis
                    </th>
                    <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                      Flagged By
                    </th>
                    <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                      Reason
                    </th>
                    <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                      Date
                    </th>
                    <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                      Status
                    </th>
                    <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
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
                        {dispute.opening_message}
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
                            onClick={() => openModal(dispute)}
                          >
                            Resolve
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            className="text-xs"
                            onClick={() => openModal(dispute)}
                          >
                            View
                          </Button>
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

      {/* Dispute detail modal */}
      <Modal
        open={!!selectedDispute}
        onClose={closeModal}
        title="Dispute Details"
        className="w-[70vw] max-w-[70vw] min-w-[20rem]"
      >
        {selectedDispute && (
          <div className="space-y-5">
            {/* Dispute info */}
            <section className="space-y-3">
              <h4 className="font-heading text-sm text-white/60">
                Dispute Info
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <DetailRow
                  label="Flagged By"
                  value={selectedDispute.flagged_by_name}
                />
                <DetailRow
                  label="Date Filed"
                  value={new Date(
                    selectedDispute.created_at,
                  ).toLocaleDateString()}
                />
              </div>
              <div>
                <span className="font-mono text-xs text-white/40">Reason</span>
                <p className="mt-0.5 whitespace-pre-wrap rounded-xs border border-border bg-surface/50 px-3 py-2 font-mono text-sm text-white/90">
                  {selectedDispute.opening_message}
                </p>
              </div>
            </section>

            <hr className="border-border" />

            {/* Thesis info */}
            <section className="space-y-3">
              <h4 className="font-heading text-sm text-white/60">
                Thesis Involved
              </h4>
              <DetailRow label="Title" value={selectedDispute.thesis_title} />
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <DetailRow
                  label="Author"
                  value={selectedDispute.thesis_author_name}
                />
                <DetailRow
                  label="Level"
                  value={formatThesisLevel(selectedDispute.thesis_level)}
                />
                <DetailRow
                  label="Category"
                  value={selectedDispute.thesis_category ?? "—"}
                />
                <DetailRow
                  label="Registered"
                  value={
                    selectedDispute.thesis_registered_at
                      ? new Date(
                          selectedDispute.thesis_registered_at,
                        ).toLocaleDateString()
                      : "—"
                  }
                />
              </div>
            </section>

            <hr className="border-border" />

            {/* Resolution section */}
            {selectedDispute.status === "open" ? (
              <section className="space-y-3">
                <h4 className="font-heading text-sm text-white/60">
                  Resolution
                </h4>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="resolution-notes"
                    className="font-mono text-xs text-white/40"
                  >
                    Resolution Notes{" "}
                    <span className="text-dispute">*</span>
                  </label>
                  <textarea
                    id="resolution-notes"
                    placeholder="Describe the resolution…"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    maxLength={MAX_REASON_LENGTH}
                    rows={3}
                    className="rounded-xs border border-border bg-surface px-3 py-2 font-mono text-sm text-white/90 placeholder:text-white/30 focus:border-accent focus:outline-none resize-y"
                  />
                  <div className="flex justify-end">
                    <span
                      className={`font-mono text-xs ${
                        resolutionNotes.length > 1800
                          ? "text-dispute"
                          : "text-white/30"
                      }`}
                    >
                      {resolutionNotes.length}/{MAX_REASON_LENGTH}
                    </span>
                  </div>
                </div>
                {error && (
                  <p className="font-mono text-xs text-dispute">{error}</p>
                )}
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setConfirmResolve(true)}
                    disabled={
                      !resolutionNotes.trim() ||
                      resolving === selectedDispute.id
                    }
                  >
                    {resolving === selectedDispute.id
                      ? "Resolving…"
                      : "Resolve Dispute"}
                  </Button>
                </div>
              </section>
            ) : (
              <section className="space-y-3">
                <h4 className="font-heading text-sm text-white/60">
                  Resolution
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <DetailRow
                    label="Resolved By"
                    value={selectedDispute.resolved_by_name ?? "—"}
                  />
                  <DetailRow
                    label="Resolved At"
                    value={
                      selectedDispute.resolved_at
                        ? new Date(
                            selectedDispute.resolved_at,
                          ).toLocaleDateString()
                        : "—"
                    }
                  />
                </div>
                {selectedDispute.closing_note && (
                  <div>
                    <span className="font-mono text-xs text-white/40">
                      Resolution Notes
                    </span>
                    <p className="mt-0.5 whitespace-pre-wrap rounded-xs border border-border bg-surface/50 px-3 py-2 font-mono text-sm text-white/90">
                      {selectedDispute.closing_note}
                    </p>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={closeModal}>
                    Close
                  </Button>
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmResolve}
        title="Resolve Dispute"
        message="Are you sure you want to resolve this dispute? This action cannot be undone."
        confirmLabel="Resolve"
        variant="primary"
        onConfirm={() => {
          setConfirmResolve(false);
          handleResolve();
        }}
        onCancel={() => setConfirmResolve(false)}
      />
    </div>
  );
}
