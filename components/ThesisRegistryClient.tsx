"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Card,
  ComboBox,
  DatePicker,
  Modal,
  Field,
  StatusChip,
  HashDisplay,
  Pagination,
  Select,
  ConfirmDialog,
} from "@/components/ui";
import { VersionTimeline } from "@/components/VersionTimeline";
import { AuthorNamesStack } from "@/components/AuthorNames";
import { formatAuthorNames, formatAuthorNamesForExport, type ThesisAuthor } from "@/lib/authors";
import { searchTheses, updateThesisStatus, type SearchFilters } from "@/lib/actions/theses";
import { getThesisActivityLogs } from "@/lib/actions/activity";
import {
  THESIS_STATUSES,
  THESIS_CATEGORIES,
  THESIS_LEVELS,
  SUBMISSION_TYPES,
} from "@/lib/constants";
import { generateCSV, downloadCSV } from "@/lib/export";
import type { ThesisStatus } from "@/lib/supabase/types";

const SEARCH_PAGE_SIZE = 25;

interface ActivityLogEntry {
  id: string;
  action: string;
  created_at: string;
  user_name: string;
}

function ThesisActivityHistory({ thesisId }: { thesisId: string }) {
  // Bundle data + the thesisId it belongs to so we can derive `loading`
  // from request identity rather than calling setState synchronously
  // inside an effect (avoids react-hooks/set-state-in-effect).
  const [state, setState] = useState<{
    thesisId: string | null;
    logs: ActivityLogEntry[];
    error: string;
  }>({ thesisId: null, logs: [], error: "" });

  const loading = state.thesisId !== thesisId;

  useEffect(() => {
    let cancelled = false;
    getThesisActivityLogs(thesisId).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setState({ thesisId, logs: [], error: result.error });
      } else {
        setState({ thesisId, logs: result.data ?? [], error: "" });
      }
    });
    return () => { cancelled = true; };
  }, [thesisId]);

  if (loading) {
    return (
      <p className="py-4 text-center text-xs text-ink-subtle">
        Loading activity…
      </p>
    );
  }

  if (state.error) {
    return (
      <p className="py-4 text-center text-xs text-danger">{state.error}</p>
    );
  }

  if (state.logs.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-ink-subtle">
        No activity recorded for this thesis.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {state.logs.map((log) => (
        <li
          key={log.id}
          className="rounded-md border border-border bg-surface/50 px-3 py-2"
        >
          <p className="text-sm text-ink">{log.action}</p>
          <p className="mt-0.5 text-xs text-ink-subtle">
            {log.user_name} · {new Date(log.created_at).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}

interface Thesis {
  id: string;
  title: string;
  thesis_authors: ThesisAuthor[];
  thesis_level: string;
  thesis_category: string;
  submission_type: string;
  sha256_hash: string;
  tx_hash: string;
  status: ThesisStatus;
  registered_at: string;
  user_email?: string;
}

export function ThesisRegistryClient() {
  // Search / filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ThesisStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Results state
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [chainParticipants, setChainParticipants] = useState<Set<string>>(new Set());
  const [supersededIds, setSupersededIds] = useState<Set<string>>(new Set());
  const [searchLoading, setSearchLoading] = useState(true);
  const [searchError, setSearchError] = useState("");
  const [page, setPage] = useState(1);

  // Action state
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedThesis, setSelectedThesis] = useState<Thesis | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ thesisId: string; newStatus: ThesisStatus } | null>(null);

  // Bulk selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTargetStatus, setBulkTargetStatus] = useState<ThesisStatus | "">("");
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const totalPages = Math.ceil(theses.length / SEARCH_PAGE_SIZE);
  const paginated = theses.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE);

  // --- Load all theses on mount ---

  useEffect(() => {
    async function loadInitial() {
      setSearchLoading(true);
      const result = await searchTheses({ includeAllStatuses: true, includeEmail: true });
      if (result.error) {
        setSearchError(result.error);
        setTheses([]);
      } else {
        setTheses((result.data as Thesis[]) ?? []);
        setChainParticipants(new Set(result.chainParticipantIds ?? []));
        setSupersededIds(new Set(result.supersededIds ?? []));
      }
      setSearchLoading(false);
    }
    loadInitial();
  }, []);

  // --- Search handler ---

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchLoading(true);
    setSearchError("");

    const filters: SearchFilters = {
      query: searchQuery,
      level: levelFilter as SearchFilters["level"],
      category: categoryFilter,
      submissionType: typeFilter as SearchFilters["submissionType"],
      status: statusFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      includeAllStatuses: true,
      includeEmail: true,
    };

    const result = await searchTheses(filters);

    if (result.error) {
      setSearchError(result.error);
      setTheses([]);
    } else {
      setTheses((result.data as Thesis[]) ?? []);
      setChainParticipants(new Set(result.chainParticipantIds ?? []));
      setSupersededIds(new Set(result.supersededIds ?? []));
    }

    setPage(1);
    setSearchLoading(false);
  }

  async function clearSearch() {
    setSearchQuery("");
    setLevelFilter("");
    setCategoryFilter("");
    setTypeFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchError("");
    setPage(1);
    setSearchLoading(true);
    const result = await searchTheses({ includeAllStatuses: true, includeEmail: true });
    if (result.error) {
      setSearchError(result.error);
      setTheses([]);
    } else {
      setTheses((result.data as Thesis[]) ?? []);
      setChainParticipants(new Set(result.chainParticipantIds ?? []));
      setSupersededIds(new Set(result.supersededIds ?? []));
    }
    setSearchLoading(false);
  }

  async function handleStatusChange(thesisId: string, newStatus: ThesisStatus) {
    if (newStatus === "flagged" || newStatus === "rejected") {
      setPendingStatusChange({ thesisId, newStatus });
      return;
    }
    await executeStatusChange(thesisId, newStatus);
  }

  async function executeStatusChange(thesisId: string, newStatus: ThesisStatus) {
    if (updating) return;
    setUpdating(thesisId);
    setError(null);
    try {
      const result = await updateThesisStatus(thesisId, newStatus);
      if (!result.error) {
        setTheses((prev) =>
          prev.map((t) => (t.id === thesisId ? { ...t, status: newStatus } : t)),
        );
      } else {
        setError(result.error);
      }
    } catch {
      setError("Status update failed. Please refresh, sign in again, and retry.");
    } finally {
      setUpdating(null);
    }
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

  function handleExportCSV() {
    const headers = ["Title", "Authors", "Hash", "Status", "Date"];
    const rows = theses.map((t) => [
      t.title,
      formatAuthorNamesForExport(t.thesis_authors),
      t.sha256_hash,
      t.status,
      new Date(t.registered_at).toLocaleDateString(),
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV("theses.csv", csv);
  }

  function toggleSelect(thesisId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(thesisId)) next.delete(thesisId);
      else next.add(thesisId);
      return next;
    });
  }

  function toggleSelectAll() {
    const pageIds = paginated.map((t) => t.id);
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

  async function executeBulkStatusChange() {
    if (!bulkTargetStatus) return;
    const ids = [...selected];
    setBulkProgress({ current: 0, total: ids.length });
    setError(null);

    for (let i = 0; i < ids.length; i++) {
      setBulkProgress({ current: i + 1, total: ids.length });
      try {
        const result = await updateThesisStatus(ids[i], bulkTargetStatus as ThesisStatus);
        if (!result.error) {
          setTheses((prev) =>
            prev.map((t) => (t.id === ids[i] ? { ...t, status: bulkTargetStatus as ThesisStatus } : t)),
          );
        } else {
          setError(`Failed on thesis ${i + 1}: ${result.error}`);
          break;
        }
      } catch {
        setError(`Failed on thesis ${i + 1}. Please refresh, sign in again, and retry.`);
        break;
      }
    }

    setSelected(new Set());
    setBulkProgress(null);
    setBulkConfirm(false);
    setBulkTargetStatus("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-ink">Thesis Registry</h1>
          <p className="mt-1 text-sm text-ink-subtle">
            Manage thesis registrations and statuses
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleExportCSV}
          disabled={theses.length === 0}
        >
          Export CSV
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary-soft px-4 py-3">
          <span className="text-sm text-ink">
            {bulkProgress
              ? `Processing ${bulkProgress.current} of ${bulkProgress.total}…`
              : `${selected.size} selected`}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-ink-subtle">Set status to</span>
            <div className="w-36">
              <Select
                value={bulkTargetStatus}
                placeholder="Select…"
                onChange={(e) => setBulkTargetStatus(e.target.value as ThesisStatus | "")}
                options={THESIS_STATUSES.map((s) => ({
                  value: s.value,
                  label: s.label,
                }))}
              />
            </div>
            <Button
              className="text-xs"
              disabled={!bulkTargetStatus || !!bulkProgress}
              onClick={() => setBulkConfirm(true)}
            >
              Apply ({selected.size})
            </Button>
            <Button
              variant="secondary"
              className="text-xs"
              disabled={!!bulkProgress}
              onClick={() => { setSelected(new Set()); setBulkTargetStatus(""); }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <Card className="p-0">
        <form onSubmit={handleSearch} className="p-6 pb-4">
          {/* Search bar row */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by title, author name, or keyword…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none"
              />
            </div>
            <Button type="submit" disabled={searchLoading}>
              {searchLoading ? "Searching…" : "Search"}
            </Button>
          </div>

          {/* Filter row */}
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr]">
            <ComboBox
              id="admin-search-category"
              label="Category"
              options={THESIS_CATEGORIES.map((c) => ({
                value: c,
                label: c,
              }))}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
            <ComboBox
              id="admin-search-level"
              label="Level"
              options={[...THESIS_LEVELS]}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            />
            <ComboBox
              id="admin-search-type"
              label="Submission Type"
              options={[...SUBMISSION_TYPES]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />
            <ComboBox
              id="admin-search-status"
              label="Status"
              options={[...THESIS_STATUSES]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ThesisStatus | "")}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm text-ink-muted">
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <DatePicker
                  value={dateFrom}
                  placeholder="From…"
                  onChange={(v) => setDateFrom(v)}
                  className="w-40"
                />
                <span className="shrink-0 self-end pb-2.5 text-xs text-ink-subtle">to</span>
                <DatePicker
                  value={dateTo}
                  placeholder="To…"
                  onChange={(v) => setDateTo(v)}
                  className="w-40"
                />
              </div>
            </div>
          </div>
          {(searchQuery || levelFilter || categoryFilter || typeFilter || statusFilter || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={clearSearch}
              className="mt-2 text-xs text-ink-subtle hover:text-ink-muted transition-colors"
            >
              Clear filters
            </button>
          )}
        </form>

        {/* Search error */}
        {searchError && (
          <div className="mx-6 mb-6 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {searchError}
          </div>
        )}

        {/* Results */}
        {!searchError && (
          <div className="border-t border-border">
            {searchLoading ? (
              <div className="flex items-center justify-center gap-3 px-6 py-10">
                <svg className="h-5 w-5 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-ink-subtle">Loading theses…</span>
              </div>
            ) : theses.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-ink-subtle">
                No theses found matching your criteria.
              </p>
            ) : (
              <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={paginated.length > 0 && paginated.every((t) => selected.has(t.id))}
                          onChange={toggleSelectAll}
                          className="cb"
                        />
                      </th>
                      <th className="px-6 py-3 text-xs text-ink-subtle uppercase">Title</th>
                      <th className="px-6 py-3 text-xs text-ink-subtle uppercase">Authors</th>
                      <th className="px-6 py-3 text-xs text-ink-subtle uppercase">Type</th>
                      <th className="px-6 py-3 text-xs text-ink-subtle uppercase">Date</th>
                      <th className="px-6 py-3 text-xs text-ink-subtle uppercase">Status</th>
                      <th className="px-6 py-3 text-xs text-ink-subtle uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((thesis) => (
                      <tr
                        key={thesis.id}
                        onClick={() => setSelectedThesis(thesis)}
                        className="cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-raised"
                      >
                        <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(thesis.id)}
                            onChange={() => toggleSelect(thesis.id)}
                            className="cb"
                          />
                        </td>
                        <td className="max-w-52 truncate px-6 py-4 text-sm text-ink">
                          {thesis.title}
                        </td>
                        <td className="max-w-36 truncate px-6 py-4 text-sm text-ink-muted">
                          {formatAuthorNames(thesis.thesis_authors)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-ink-muted capitalize">
                          {thesis.submission_type}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-ink-muted">
                          {new Date(thesis.registered_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <StatusChip status={thesis.status} />
                            {supersededIds.has(thesis.id) && (
                              <span className="inline-block border-l-2 border-l-white/20 pl-2 py-0.5 text-xs uppercase text-ink-subtle">
                                superseded
                              </span>
                            )}
                          </div>
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
          </div>
        )}
      </Card>

      {/* Thesis detail modal */}
      <Modal
        open={!!selectedThesis}
        onClose={() => setSelectedThesis(null)}
        title="Thesis Details"
        className={
          selectedThesis && chainParticipants.has(selectedThesis.id)
            ? "w-5xl max-w-[95vw] min-h-128"
            : "w-160 max-w-[92vw] min-h-128"
        }
      >
        {selectedThesis && (
          <div className="space-y-5">
            {chainParticipants.has(selectedThesis.id) ? (
              <div className="flex gap-6">
                <div className="min-w-0 flex-1 space-y-5">
                  <AuthorNamesStack authors={selectedThesis.thesis_authors} />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Title" value={selectedThesis.title} />
                    {selectedThesis.user_email && (
                      <Field label="Email" value={selectedThesis.user_email} />
                    )}
                    <Field label="Level" value={selectedThesis.thesis_level} capitalize />
                    <Field label="Category" value={selectedThesis.thesis_category} />
                    <Field label="Submission Type" value={selectedThesis.submission_type} capitalize />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-ink-subtle">Status</span>
                      <StatusChip status={selectedThesis.status} />
                    </div>
                    <Field
                      label="Registered"
                      value={new Date(selectedThesis.registered_at).toLocaleString()}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-ink-subtle">SHA-256 Hash</span>
                      <HashDisplay hash={selectedThesis.sha256_hash} copyable />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-ink-subtle">Transaction</span>
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

                  <hr className="border-border" />
                  <section>
                    <h3 className="mb-3 text-xs uppercase text-ink-subtle">
                      Activity History
                    </h3>
                    <ThesisActivityHistory thesisId={selectedThesis.id} />
                  </section>
                </div>

                <div className="w-80 shrink-0 border-l border-border pl-6 max-h-[60vh] overflow-y-auto">
                  <h3 className="mb-3 text-xs uppercase text-ink-subtle sticky top-0 bg-surface pb-2">
                    Version History
                  </h3>
                  <VersionTimeline
                    thesisId={selectedThesis.id}
                    currentThesisId={selectedThesis.id}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <AuthorNamesStack authors={selectedThesis.thesis_authors} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Title" value={selectedThesis.title} />
                  {selectedThesis.user_email && (
                    <Field label="Email" value={selectedThesis.user_email} />
                  )}
                  <Field label="Level" value={selectedThesis.thesis_level} capitalize />
                  <Field label="Category" value={selectedThesis.thesis_category} />
                  <Field label="Submission Type" value={selectedThesis.submission_type} capitalize />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-ink-subtle">Status</span>
                    <StatusChip status={selectedThesis.status} />
                  </div>
                  <Field
                    label="Registered"
                    value={new Date(selectedThesis.registered_at).toLocaleString()}
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-ink-subtle">SHA-256 Hash</span>
                    <HashDisplay hash={selectedThesis.sha256_hash} copyable />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-ink-subtle">Transaction</span>
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

                <hr className="border-border" />
                <section>
                  <h3 className="mb-3 text-xs uppercase text-ink-subtle">
                    Activity History
                  </h3>
                  <ThesisActivityHistory thesisId={selectedThesis.id} />
                </section>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pendingStatusChange}
        title={pendingStatusChange?.newStatus === "flagged" ? "Flag Thesis" : "Reject Thesis"}
        message={
          pendingStatusChange?.newStatus === "flagged"
            ? "This will flag the thesis for review. Are you sure?"
            : "This will reject the thesis. Are you sure?"
        }
        confirmLabel={pendingStatusChange?.newStatus === "flagged" ? "Flag" : "Reject"}
        variant="danger"
        onConfirm={() => {
          if (pendingStatusChange) {
            executeStatusChange(pendingStatusChange.thesisId, pendingStatusChange.newStatus);
          }
          setPendingStatusChange(null);
        }}
        onCancel={() => setPendingStatusChange(null)}
      />

      <ConfirmDialog
        open={bulkConfirm}
        title="Bulk Status Change"
        message={`Set ${selected.size} selected thesis(es) to "${bulkTargetStatus}"? This action will be applied sequentially.`}
        confirmLabel={`Apply to ${selected.size}`}
        variant={bulkTargetStatus === "flagged" || bulkTargetStatus === "rejected" ? "danger" : "primary"}
        onConfirm={executeBulkStatusChange}
        onCancel={() => setBulkConfirm(false)}
      />
    </div>
  );
}
