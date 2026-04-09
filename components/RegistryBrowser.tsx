"use client";

import { useState, useRef } from "react";
import { searchTheses, type SearchFilters, type VersionChainEntry } from "@/lib/actions/theses";
import {
  Button,
  Card,
  Select,
  DatePicker,
  StatusChip,
  HashDisplay,
  Pagination,
} from "@/components/ui";
import { DisputeButton } from "@/components/DisputeButton";
import {
  THESIS_CATEGORIES,
  THESIS_LEVELS,
  PAGE_SIZE,
} from "@/lib/constants";
import type { ThesisStatus } from "@/lib/supabase/types";

// --- Types ---

type ThesisResult = {
  id: string;
  user_id: string;
  title: string;
  author_name: string;
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchPage, setSearchPage] = useState(1);

  // Verify state
  const [verifyMode, setVerifyMode] = useState<"upload" | "paste">("upload");
  const [hashInput, setHashInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Search handlers ---

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchLoading(true);
    setSearchError("");
    setHasSearched(true);

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
    }

    setSearchPage(1);
    setSearchLoading(false);
  }

  function clearSearch() {
    setSearchQuery("");
    setLevelFilter("");
    setCategoryFilter("");
    setTypeFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchResults([]);
    setSearchError("");
    setHasSearched(false);
    setSearchPage(1);
  }

  // --- Verify handlers ---

  async function processFile(file: File) {
    if (file.type !== "application/pdf") {
      setVerifyError("Only PDF files are accepted.");
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
    <div className="space-y-10">
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
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            <Select
              id="search-category"
              label="Category"
              options={THESIS_CATEGORIES.map((c) => ({
                value: c,
                label: c,
              }))}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
            <Select
              id="search-level"
              label="Level"
              options={[...THESIS_LEVELS]}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
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
        {hasSearched && !searchError && (
          <div className="border-t border-border">
            {searchResults.length === 0 ? (
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
                        Level
                      </th>
                      <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                        Category
                      </th>
                      <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                        Type
                      </th>
                      <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                        Registered Date
                      </th>
                      <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                        Tx Hash
                      </th>
                      {currentUserId && (
                        <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults
                      .slice((searchPage - 1) * PAGE_SIZE, searchPage * PAGE_SIZE)
                      .map((thesis) => (
                      <tr
                        key={thesis.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="max-w-48 truncate px-6 py-4 font-mono text-sm text-white/90">
                          {thesis.title}
                        </td>
                        <td className="max-w-36 truncate px-6 py-4 font-mono text-sm text-white/60">
                          {thesis.author_name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm capitalize text-white/60">
                          {thesis.thesis_level}
                        </td>
                        <td className="max-w-40 truncate px-6 py-4 font-mono text-sm text-white/60">
                          {thesis.thesis_category}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm capitalize text-white/60">
                          {thesis.submission_type}
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
                          >
                            <HashDisplay hash={thesis.tx_hash} />
                          </a>
                        </td>
                        {currentUserId && (
                          <td className="px-6 py-4">
                            {thesis.user_id !== currentUserId && (
                              <DisputeButton thesisId={thesis.id} />
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {searchResults.length >= 50 && (
                  <p className="px-6 py-3 font-mono text-xs text-white/30">
                    Showing first 50 results. Refine your search for more
                    specific matches.
                  </p>
                )}
              </div>
              <Pagination
                currentPage={searchPage}
                totalPages={Math.ceil(searchResults.length / PAGE_SIZE)}
                onPageChange={setSearchPage}
              />
              </>
            )}
          </div>
        )}
      </Card>

      {/* ================================ */}
      {/* SECTION 2: Verify a Document    */}
      {/* ================================ */}
      <Card className="p-0">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg text-white">
            Verify a Document
          </h2>
        </div>

        <div className="p-6">
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
                          label="Author"
                          value={verifyResult.thesis.author_name}
                        />
                        <Field
                          label="Level"
                          value={verifyResult.thesis.thesis_level}
                          capitalize
                        />
                        <Field
                          label="Category"
                          value={verifyResult.thesis.thesis_category}
                        />
                        <Field
                          label="Submission Type"
                          value={verifyResult.thesis.submission_type}
                          capitalize
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
      </Card>
    </div>
  );
}

// --- Internal helper component ---

function Field({
  label,
  value,
  capitalize: cap,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs text-white/40">{label}</span>
      <span
        className={`font-mono text-sm text-white/90 ${cap ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
