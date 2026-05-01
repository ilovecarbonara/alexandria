"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  StatusChip,
  Button,
  Pagination,
  Select,
  Modal,
  ConfirmDialog,
} from "@/components/ui";
import { DisputeThread } from "@/components/DisputeThread";
import { PAGE_SIZE, THESIS_LEVELS } from "@/lib/constants";
import { MAX_REASON_LENGTH } from "@/lib/validation";
import { generateCSV, downloadCSV } from "@/lib/export";
import {
  getDispute,
  type DisputeThreadView,
} from "@/lib/actions/disputes";
import type { DisputeAuthorRole } from "@/lib/supabase/types";

export interface AdminDisputeRow {
  id: string;
  status: "open" | "resolved";
  created_at: string;
  thesis_id: string;
  thesis_title: string;
  thesis_authors: string;
  thesis_level: string | null;
  thesis_category: string | null;
  thesis_registered_at: string | null;
  flagged_by_name: string;
  resolved_by_name: string | null;
  resolved_at: string | null;
  /** Body of the opening (flagger) message — used for CSV export. */
  opening_message: string;
  /** Body of the admin's closing message (only present once resolved). */
  closing_note: string | null;
  /** Last message metadata for the table preview column. */
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_role: DisputeAuthorRole | null;
  unread_count: number;
}

interface DisputeManagementClientProps {
  initialDisputes: AdminDisputeRow[];
}

const ROLE_LABEL: Record<DisputeAuthorRole, string> = {
  flagger: "Flagger",
  owner: "Owner",
  admin: "Admin",
};

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

function lastPreview(row: AdminDisputeRow): string {
  if (!row.last_message_preview || !row.last_message_role) {
    return "No messages yet.";
  }
  return `${ROLE_LABEL[row.last_message_role]}: ${row.last_message_preview}`;
}

export function DisputeManagementClient({
  initialDisputes,
}: DisputeManagementClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [page, setPage] = useState(1);

  const [openId, setOpenId] = useState<string | null>(null);
  // Bundle the loaded thread with the dispute id it was loaded for so we
  // can derive thread/error state without calling setState synchronously
  // inside the loading effect.
  const [loaded, setLoaded] = useState<{
    id: string;
    thread: DisputeThreadView | null;
    error: string | null;
  } | null>(null);

  const [closingNote, setClosingNote] = useState("");
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [confirmResolve, setConfirmResolve] = useState(false);
  const [isResolving, startResolve] = useTransition();

  const filtered =
    filter === "all"
      ? initialDisputes
      : initialDisputes.filter((d) => d.status === filter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selected = openId
    ? (initialDisputes.find((d) => d.id === openId) ?? null)
    : null;

  const thread = loaded && loaded.id === openId ? loaded.thread : null;
  const loadError = loaded && loaded.id === openId ? loaded.error : null;

  useEffect(() => {
    if (!openId) return;
    let cancelled = false;
    void getDispute(openId)
      .then((res) => {
        if (cancelled) return;
        if (res.error || !res.data) {
          setLoaded({
            id: openId,
            thread: null,
            error: res.error ?? "Failed to load dispute.",
          });
        } else {
          setLoaded({ id: openId, thread: res.data, error: null });
        }
      })
      .catch((e) => {
        console.error("getDispute failed", e);
        if (!cancelled) {
          setLoaded({
            id: openId,
            thread: null,
            error: "Failed to load dispute.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [openId]);

  // Refetch the open thread after an inline message post so admin replies
  // appear immediately — router.refresh() does not update this client-state
  // snapshot.
  function refetchThread() {
    const id = openId;
    if (!id) return;
    void getDispute(id)
      .then((res) => {
        if (!res.error && res.data) {
          setLoaded({ id, thread: res.data, error: null });
        }
      })
      .catch((e) => console.error("getDispute (refetch) failed", e));
  }

  function closeModal() {
    setOpenId(null);
    setClosingNote("");
    setResolveError(null);
    router.refresh();
  }

  function handleExportCSV() {
    const headers = [
      "Thesis",
      "Flagged By",
      "Opening Message",
      "Status",
      "Date",
    ];
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

  async function handleResolve() {
    if (!selected || isResolving) return;
    setResolveError(null);
    startResolve(async () => {
      const res = await fetch(`/api/disputes/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closing_note: closingNote }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setResolveError(
          data?.error ?? "Failed to resolve dispute. Please try again.",
        );
        return;
      }
      // Re-fetch the thread so the closing message + resolved status appear.
      const refetched = await getDispute(selected.id);
      if (!refetched.error && refetched.data) {
        setLoaded({ id: selected.id, thread: refetched.data, error: null });
      }
      setClosingNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-white">
            Dispute Management
          </h1>
          <p className="mt-1 font-mono text-sm text-white/40">
            Review threaded disputes and resolve open cases
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
                      Last Message
                    </th>
                    <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                      Last Activity
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
                      <td className="max-w-72 px-6 py-4 font-mono text-sm text-white/60">
                        <span className="flex items-center gap-2">
                          {dispute.unread_count > 0 && (
                            <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-dispute px-1.5 py-0.5 font-mono text-[10px] leading-none text-white">
                              {dispute.unread_count}
                            </span>
                          )}
                          <span className="truncate">
                            {lastPreview(dispute)}
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                        {new Date(
                          dispute.last_message_at ?? dispute.created_at,
                        ).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <StatusChip status={dispute.status} />
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          className="text-xs"
                          variant={
                            dispute.status === "open" ? "primary" : "secondary"
                          }
                          onClick={() => setOpenId(dispute.id)}
                        >
                          {dispute.status === "open" ? "Open" : "View"}
                        </Button>
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

      <Modal
        open={openId !== null}
        onClose={closeModal}
        title="Dispute Details"
        className="w-[70vw] max-w-[70vw] min-w-[20rem]"
      >
        {selected && (
          <div className="space-y-5">
            {/* Thesis info */}
            <section className="space-y-3">
              <h4 className="font-heading text-sm text-white/60">
                Thesis Involved
              </h4>
              <DetailRow label="Title" value={selected.thesis_title} />
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <DetailRow
                  label="Authors"
                  value={selected.thesis_authors}
                />
                <DetailRow
                  label="Level"
                  value={formatThesisLevel(selected.thesis_level)}
                />
                <DetailRow
                  label="Category"
                  value={selected.thesis_category ?? "—"}
                />
                <DetailRow
                  label="Registered"
                  value={
                    selected.thesis_registered_at
                      ? new Date(
                          selected.thesis_registered_at,
                        ).toLocaleDateString()
                      : "—"
                  }
                />
              </div>
            </section>

            <hr className="border-border" />

            {/* Thread */}
            <section className="space-y-3">
              <h4 className="font-heading text-sm text-white/60">
                Conversation
              </h4>
              {loadError ? (
                <p className="font-mono text-sm text-dispute">{loadError}</p>
              ) : thread ? (
                <DisputeThread dispute={thread} onChanged={refetchThread} />
              ) : (
                <p className="font-mono text-sm text-white/50">
                  Loading thread…
                </p>
              )}
            </section>

            {/* Resolve panel — only while open and thread is loaded */}
            {thread && thread.status === "open" && (
              <>
                <hr className="border-border" />
                <section className="space-y-3">
                  <h4 className="font-heading text-sm text-white/60">
                    Resolve Dispute
                  </h4>
                  <p className="font-mono text-xs text-white/40">
                    Posting a closing note appends it as the final admin
                    message and locks the thread.
                  </p>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="closing-note"
                      className="font-mono text-xs text-white/40"
                    >
                      Closing Note <span className="text-dispute">*</span>
                    </label>
                    <textarea
                      id="closing-note"
                      placeholder="Summarize the outcome…"
                      value={closingNote}
                      onChange={(e) => setClosingNote(e.target.value)}
                      maxLength={MAX_REASON_LENGTH}
                      rows={3}
                      className="resize-y rounded-xs border border-border bg-surface px-3 py-2 font-mono text-sm text-white/90 placeholder:text-white/30 focus:border-accent focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <span
                        className={`font-mono text-xs ${
                          closingNote.length > 1800
                            ? "text-dispute"
                            : "text-white/30"
                        }`}
                      >
                        {closingNote.length}/{MAX_REASON_LENGTH}
                      </span>
                    </div>
                  </div>
                  {resolveError && (
                    <p className="font-mono text-xs text-dispute">
                      {resolveError}
                    </p>
                  )}
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={closeModal}>
                      Close
                    </Button>
                    <Button
                      onClick={() => setConfirmResolve(true)}
                      disabled={!closingNote.trim() || isResolving}
                    >
                      {isResolving ? "Resolving…" : "Resolve Dispute"}
                    </Button>
                  </div>
                </section>
              </>
            )}

            {/* Resolved metadata */}
            {thread && thread.status === "resolved" && (
              <>
                <hr className="border-border" />
                <section className="space-y-3">
                  <h4 className="font-heading text-sm text-white/60">
                    Resolution
                  </h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <DetailRow
                      label="Resolved By"
                      value={selected.resolved_by_name ?? "—"}
                    />
                    <DetailRow
                      label="Resolved At"
                      value={
                        selected.resolved_at
                          ? new Date(selected.resolved_at).toLocaleDateString()
                          : "—"
                      }
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button variant="secondary" onClick={closeModal}>
                      Close
                    </Button>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmResolve}
        title="Resolve Dispute"
        message="Are you sure you want to resolve this dispute? The thread will become read-only."
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
