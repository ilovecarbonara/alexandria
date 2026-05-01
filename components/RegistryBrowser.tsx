"use client";

import { useState, useRef, useEffect } from "react";
import { searchTheses, type SearchFilters, type VersionChainEntry } from "@/lib/actions/theses";
import {
  Button,
  Card,
  ComboBox,
  DatePicker,
  Field,
  StatusChip,
  HashDisplay,
  Pagination,
  Modal,
} from "@/components/ui";
import { DisputeButton } from "@/components/DisputeButton";
import { VersionTimeline } from "@/components/VersionTimeline";
import { formatAuthorNames, type ThesisAuthor } from "@/lib/authors";
import {
  THESIS_CATEGORIES,
  THESIS_LEVELS,
  SUBMISSION_TYPES,
  MAX_PDF_FILE_SIZE_MB,
} from "@/lib/constants";
import type { ThesisStatus } from "@/lib/supabase/types";

const SEARCH_PAGE_SIZE = 25;

// --- Types ---

type ThesisResult = {
  id: string;
  user_id: string;
  title: string;
  thesis_authors: ThesisAuthor[];
  thesis_level: string;
  thesis_category: string;
  submission_type: string;
  sha256_hash: string;
  tx_hash: string;
  status: ThesisStatus;
  registered_at: string;
};

type VerifyResult = {
  isRegistered: boolean;
  blockchain?: {
    sha256Hash: string;
    submissionType: string;
    thesisLevel: string;
    thesisCategory: string;
    timestamp: number;
    registeredBy: string;
  };
  thesis?: ThesisResult | null;
  versionChain?: VersionChainEntry[];
};

// --- Helpers ---

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- Component ---

export function RegistryBrowser({ currentUserId }: { currentUserId?: string }) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchResults, setSearchResults] = useState<ThesisResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(true);
  const [searchError, setSearchError] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [chainParticipants, setChainParticipants] = useState<Set<string>>(new Set());
  const [historyThesisId, setHistoryThesisId] = useState<string | null>(null);
  const [selectedThesis, setSelectedThesis] = useState<ThesisResult | null>(null);

  // Verify state
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyMode, setVerifyMode] = useState<"upload" | "paste">("upload");
  const [hashInput, setHashInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Load all theses on mount ---

  useEffect(() => {
    async function loadInitial() {
      setSearchLoading(true);
      const result = await searchTheses({});
      if (result.error) {
        setSearchError(result.error);
        setSearchResults([]);
      } else {
        setSearchResults(result.data ?? []);
        setChainParticipants(new Set(result.chainParticipantIds ?? []));
      }
      setSearchLoading(false);
    }
    loadInitial();
  }, []);

  // --- Search handlers ---

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchLoading(true);
    setSearchError("");

    const filters: SearchFilters = {
      query: searchQuery,
      level: levelFilter as SearchFilters["level"],
      category: categoryFilter,
      submissionType: typeFilter as SearchFilters["submissionType"],
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    const result = await searchTheses(filters);

    if (result.error) {
      setSearchError(result.error);
      setSearchResults([]);
    } else {
      setSearchResults(result.data ?? []);
      setChainParticipants(new Set(result.chainParticipantIds ?? []));
    }

    setSearchPage(1);
    setSearchLoading(false);
  }

  async function clearSearch() {
    setSearchQuery("");
    setLevelFilter("");
    setCategoryFilter("");
    setTypeFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchError("");
    setSearchPage(1);
    // Reload all theses
    setSearchLoading(true);
    const result = await searchTheses({});
    if (result.error) {
      setSearchError(result.error);
      setSearchResults([]);
    } else {
      setSearchResults(result.data ?? []);
      setChainParticipants(new Set(result.chainParticipantIds ?? []));
    }
    setSearchLoading(false);
  }

  // --- Verify handlers ---

  async function processFile(file: File) {
    if (file.type !== "application/pdf") {
      setVerifyError("Only PDF files are accepted.");
      setFileName(null);
      setFileHash(null);
      return;
    }
    if (file.size > MAX_PDF_FILE_SIZE_MB * 1024 * 1024) {
      setVerifyError(`File size exceeds the ${MAX_PDF_FILE_SIZE_MB} MB limit.`);
      setFileName(null);
      setFileHash(null);
      return;
    }
    setFileName(file.name);
    setVerifyError("");
    setVerifyResult(null);
    setVerifyMode("upload");
    const hash = await hashFile(file);
    setFileHash(hash);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName(null);
      setFileHash(null);
      return;
    }
    await processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError("");
    setVerifyResult(null);
    setVerifyLoading(true);

    const hash =
      verifyMode === "upload" ? fileHash : hashInput.trim().toLowerCase();

    if (!hash) {
      setVerifyError(
        verifyMode === "upload"
          ? "Please upload a PDF file first."
          : "Please enter a SHA-256 hash.",
      );
      setVerifyLoading(false);
      return;
    }

    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      setVerifyError("Invalid SHA-256 hash format (expected 64 hex characters).");
      setVerifyLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/theses/verify?hash=${encodeURIComponent(hash)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setVerifyError(data.error || "Verification failed.");
      } else {
        setVerifyResult(data);
      }
    } catch {
      setVerifyError("Network error. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  }

  function clearVerify() {
    setHashInput("");
    setFileName(null);
    setFileHash(null);
    setVerifyResult(null);
    setVerifyError("");
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Verify a Document button */}
      <div className="flex justify-end">
        <Button type="button" onClick={() => setVerifyOpen(true)}>
          Verify a Document
        </Button>
      </div>

      {/* =============================== */}
      {/* SECTION 1: Search the Registry */}
      {/* =============================== */}
      <Card className="p-0">
        <form onSubmit={handleSearch} className="p-6 pb-4">
          {/* Search bar row */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
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
                className="w-full rounded-xs border border-border bg-surface py-2.5 pl-10 pr-3 font-mono text-sm text-white/90 placeholder:text-white/30 focus:border-accent focus:outline-none"
              />
            </div>
            <Button type="submit" disabled={searchLoading}>
              {searchLoading ? "Searching…" : "Search"}
            </Button>
          </div>

          {/* Filter row */}
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-[1.5fr_1fr_1fr_1.5fr]">
            <ComboBox
              id="search-category"
              label="Category"
              options={THESIS_CATEGORIES.map((c) => ({
                value: c,
                label: c,
              }))}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
            <ComboBox
              id="search-level"
              label="Level"
              options={[...THESIS_LEVELS]}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            />
            <ComboBox
              id="search-type"
              label="Submission Type"
              options={[...SUBMISSION_TYPES]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />

            <div className="flex flex-col gap-1">
              <label className="font-mono text-sm text-white/60">
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <DatePicker
                  value={dateFrom}
                  placeholder="From…"
                  onChange={(v) => setDateFrom(v)}
                  className="w-40"
                />
                <span className="shrink-0 self-end pb-2.5 font-mono text-xs text-white/40">to</span>
                <DatePicker
                  value={dateTo}
                  placeholder="To…"
                  onChange={(v) => setDateTo(v)}
                  className="w-40"
                />
              </div>
            </div>
          </div>
          {(levelFilter || categoryFilter || typeFilter || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={clearSearch}
              className="mt-2 font-mono text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Clear filters
            </button>
          )}
        </form>

        {/* Search error */}
        {searchError && (
          <div className="mx-6 mb-6 rounded-xs border border-dispute/30 bg-dispute/10 px-4 py-3 font-mono text-sm text-dispute">
            {searchError}
          </div>
        )}

        {/* Search results */}
        {!searchError && (
          <div className="border-t border-border">
            {searchLoading ? (
              <div className="flex items-center justify-center gap-3 px-6 py-10">
                <svg className="h-5 w-5 animate-spin text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="font-mono text-sm text-white/40">Loading theses…</span>
              </div>
            ) : searchResults.length === 0 ? (
              <p className="px-6 py-10 text-center font-mono text-sm text-white/40">
                No theses found matching your criteria.
              </p>
            ) : (
              <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                        Title
                      </th>
                      <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                        Author
                      </th>
                      <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                        Date
                      </th>
                      <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                        Tx Hash
                      </th>
                      <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults
                      .slice((searchPage - 1) * SEARCH_PAGE_SIZE, searchPage * SEARCH_PAGE_SIZE)
                      .map((thesis) => (
                      <tr
                        key={thesis.id}
                        onClick={() => setSelectedThesis(thesis)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedThesis(thesis);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`View details for ${thesis.title}`}
                        className="cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-white/5 focus:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                      >
                        <td className="max-w-64 truncate px-6 py-4 font-mono text-sm text-white/90">
                          {thesis.title}
                        </td>
                        <td className="max-w-36 truncate px-6 py-4 font-mono text-sm text-white/60">
                          {formatAuthorNames(thesis.thesis_authors)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                          {new Date(thesis.registered_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={`https://sepolia.etherscan.io/tx/${thesis.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <HashDisplay hash={thesis.tx_hash} />
                          </a>
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          {chainParticipants.has(thesis.id) || (currentUserId && thesis.user_id !== currentUserId) ? (
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            {chainParticipants.has(thesis.id) && (
                              <Button
                                variant="secondary"
                                onClick={() => setHistoryThesisId(thesis.id)}
                                aria-label="View version history"
                                className="text-xs px-2 py-1 inline-flex items-center gap-1.5"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                History
                              </Button>
                            )}
                            {currentUserId && thesis.user_id !== currentUserId && (
                              <DisputeButton thesisId={thesis.id} fetchSimilarity />
                            )}
                          </div>
                          ) : (
                            <span className="font-mono text-sm text-white/30">&mdash;</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={searchPage}
                totalPages={Math.ceil(searchResults.length / SEARCH_PAGE_SIZE)}
                onPageChange={setSearchPage}
              />
              </>
            )}
          </div>
        )}
      </Card>

      {/* ================================ */}
      {/* Thesis Detail Modal              */}
      {/* ================================ */}
      <Modal
        open={!!selectedThesis}
        onClose={() => setSelectedThesis(null)}
        title="Thesis Details"
        className={selectedThesis && chainParticipants.has(selectedThesis.id) ? "min-w-[70vw]" : "min-w-[40vw]"}
      >
        {selectedThesis && (
          <div className="space-y-5">
            {chainParticipants.has(selectedThesis.id) ? (
              /* Side-by-side layout: metadata left, version history right */
              <div className="flex gap-6">
                <div className="min-w-0 flex-1 space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Title" value={selectedThesis.title} />
                    <Field label="Authors" value={formatAuthorNames(selectedThesis.thesis_authors)} />
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

                  {/* Actions */}
                  {currentUserId && selectedThesis.user_id !== currentUserId && (
                    <div className="flex items-center gap-2 border-t border-border pt-4">
                      <DisputeButton thesisId={selectedThesis.id} fetchSimilarity />
                    </div>
                  )}
                </div>

                {/* Version Timeline — right side */}
                <div className="w-80 shrink-0 border-l border-border pl-6 max-h-[60vh] overflow-y-auto">
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
              /* Standard layout: no version chain */
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Title" value={selectedThesis.title} />
                  <Field label="Authors" value={formatAuthorNames(selectedThesis.thesis_authors)} />
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

                {/* Actions */}
                {currentUserId && selectedThesis.user_id !== currentUserId && (
                  <div className="flex items-center gap-2 border-t border-border pt-4">
                    <DisputeButton thesisId={selectedThesis.id} fetchSimilarity />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ================================ */}
      {/* Version History Modal            */}
      {/* ================================ */}
      <Modal
        open={!!historyThesisId}
        onClose={() => setHistoryThesisId(null)}
        title="Version History"
        className="min-w-[40vw]"
      >
        {historyThesisId && (
          <VersionTimeline
            thesisId={historyThesisId}
            currentThesisId={historyThesisId}
          />
        )}
      </Modal>

      {/* ================================ */}
      {/* Verify a Document Modal         */}
      {/* ================================ */}
      <Modal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        title="Verify a Document"
        className="min-w-[60vw]"
      >
        <div className="space-y-4">
          {/* Side-by-side panels */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Upload panel */}
            <div
              onClick={() => {
                setVerifyMode("upload");
                fileRef.current?.click();
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              className={`group flex cursor-pointer flex-col items-center justify-center rounded-xs border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragging
                  ? "border-accent bg-accent/10"
                  : verifyMode === "upload" && fileName
                    ? "border-accent/50 bg-accent/5"
                    : "border-border hover:border-white/20"
              }`}
            >
              <svg
                className="mb-3 text-white/20 group-hover:text-white/40 transition-colors"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {fileName ? (
                <>
                  <p className="font-mono text-sm text-white/90">{fileName}</p>
                  {fileHash && (
                    <p className="mt-1 font-mono text-xs text-white/40">
                      SHA-256: <HashDisplay hash={fileHash} />
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-mono text-sm text-white/50">
                    Drag and drop PDF thesis file here
                  </p>
                  <p className="mt-1 font-mono text-xs text-white/30">
                    or{" "}
                    <span className="text-accent underline">browse files</span>
                  </p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Hash paste panel */}
            <div
              onClick={() => setVerifyMode("paste")}
              className={`flex flex-col justify-center rounded-xs border px-6 py-10 transition-colors ${
                verifyMode === "paste"
                  ? "border-accent/50 bg-accent/5"
                  : "border-border hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="text-white/20"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                <span className="font-mono text-xs text-white/40 uppercase tracking-wide">
                  Paste SHA-256 Hash
                </span>
              </div>
              <input
                type="text"
                placeholder="Enter 64-character hex hash…"
                value={hashInput}
                onChange={(e) => {
                  setHashInput(e.target.value);
                  setVerifyMode("paste");
                }}
                maxLength={64}
                className="w-full rounded-xs border border-border bg-surface px-3 py-2 font-mono text-sm text-white/90 placeholder:text-white/30 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={(e) => {
                setVerifyMode("upload");
                handleVerify(e as unknown as React.FormEvent);
              }}
              disabled={verifyLoading || !fileHash}
              className="rounded-xs border border-accent/40 py-2.5 font-mono text-sm text-accent transition-colors hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {verifyLoading && verifyMode === "upload"
                ? "Verifying…"
                : "Verify File Integrity"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                setVerifyMode("paste");
                handleVerify(e as unknown as React.FormEvent);
              }}
              disabled={verifyLoading || !hashInput.trim()}
              className="rounded-xs border border-accent/40 py-2.5 font-mono text-sm text-accent transition-colors hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {verifyLoading && verifyMode === "paste"
                ? "Verifying…"
                : "Run Validation"}
            </button>
          </div>

          {/* Clear */}
          {(fileName || hashInput) && (
            <button
              type="button"
              onClick={clearVerify}
              className="mt-3 font-mono text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Clear
            </button>
          )}

          {/* Verify error */}
          {verifyError && (
            <div className="mt-4 rounded-xs border border-dispute/30 bg-dispute/10 px-4 py-3 font-mono text-sm text-dispute">
              {verifyError}
            </div>
          )}

          {/* Verify result */}
          {verifyResult && (
            <div className="mt-6 space-y-4">
              {verifyResult.isRegistered ? (
                <div className="rounded-xs border border-success/30 bg-success/10 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-success">
                      &#10003; Registered on Blockchain
                    </span>
                  </div>

                  {/* Metadata grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {verifyResult.thesis && (
                      <>
                        <Field
                          label="Title"
                          value={verifyResult.thesis.title}
                        />
                        <Field
                          label="Authors"
                          value={formatAuthorNames(verifyResult.thesis.thesis_authors)}
                        />
                        <Field
                          label="Level"
                          value={verifyResult.thesis.thesis_level}
                          capitalize
                          small
                        />
                        <Field
                          label="Category"
                          value={verifyResult.thesis.thesis_category}
                        />
                        <Field
                          label="Submission Type"
                          value={verifyResult.thesis.submission_type}
                          capitalize
                          small
                        />
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs text-white/40">
                            Status
                          </span>
                          <StatusChip status={verifyResult.thesis.status} />
                        </div>
                        <Field
                          label="Registered"
                          value={new Date(
                            verifyResult.thesis.registered_at,
                          ).toLocaleString()}
                        />
                      </>
                    )}

                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs text-white/40">
                        SHA-256 Hash
                      </span>
                      <HashDisplay
                        hash={
                          verifyResult.thesis?.sha256_hash ??
                          verifyResult.blockchain!.sha256Hash
                        }
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs text-white/40">
                        Transaction
                      </span>
                      {verifyResult.thesis?.tx_hash ? (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${verifyResult.thesis.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          <HashDisplay hash={verifyResult.thesis.tx_hash} />
                        </a>
                      ) : (
                        <span className="font-mono text-sm text-white/40">
                          —
                        </span>
                      )}
                    </div>

                    {verifyResult.blockchain && (
                      <>
                        <Field
                          label="Blockchain Timestamp"
                          value={new Date(
                            verifyResult.blockchain.timestamp * 1000,
                          ).toLocaleString()}
                        />
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs text-white/40">
                            Registered By (Wallet)
                          </span>
                          <HashDisplay
                            hash={verifyResult.blockchain.registeredBy}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Version Chain */}
                  {verifyResult.versionChain &&
                    verifyResult.versionChain.length > 1 && (
                      <div className="mt-5 border-t border-success/20 pt-4">
                        <h3 className="mb-3 font-mono text-xs uppercase text-white/40">
                          Version History
                        </h3>
                        <div>
                          {verifyResult.versionChain.map((entry, index) => {
                            const isCurrent =
                              entry.id === verifyResult.thesis?.id;
                            const isLast =
                              index ===
                              verifyResult.versionChain!.length - 1;

                            return (
                              <div key={entry.id} className="flex gap-3">
                                {/* Timeline track */}
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 ${
                                      isCurrent
                                        ? "border-accent bg-accent"
                                        : "border-white/30 bg-transparent"
                                    }`}
                                  />
                                  {!isLast && (
                                    <div className="w-px flex-1 bg-white/10" />
                                  )}
                                </div>

                                {/* Content */}
                                <div className={isLast ? "pb-0" : "pb-5"}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-white/40">
                                      v{index + 1}
                                    </span>
                                    <span
                                      className={`inline-block rounded-xs px-1.5 py-0.5 font-mono text-xs uppercase ${
                                        entry.submissionType === "final"
                                          ? "bg-success/20 text-success"
                                          : "bg-pending/20 text-pending"
                                      }`}
                                    >
                                      {entry.submissionType}
                                    </span>
                                    {isCurrent && (
                                      <span className="font-mono text-xs text-accent">
                                        current
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className={`mt-1 font-mono text-sm ${
                                      isCurrent
                                        ? "text-white"
                                        : "text-white/70"
                                    }`}
                                  >
                                    {entry.title}
                                  </p>
                                  <div className="mt-1 flex items-center gap-2 font-mono text-xs text-white/40">
                                    <span>
                                      {new Date(
                                        entry.registeredAt,
                                      ).toLocaleDateString()}
                                    </span>
                                    <span>·</span>
                                    <HashDisplay hash={entry.sha256Hash} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="rounded-xs border border-white/10 bg-white/5 p-5">
                  <span className="font-mono text-sm text-white/60">
                    &#10007; This hash is not registered on the blockchain.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
