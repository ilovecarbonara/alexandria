"use client";

import { useState, useRef } from "react";
import { searchTheses, type SearchFilters } from "@/lib/actions/theses";
import {
  Button,
  Card,
  Input,
  Select,
  StatusChip,
  HashDisplay,
} from "@/components/ui";
import { DisputeButton } from "@/components/DisputeButton";
import {
  THESIS_CATEGORIES,
  THESIS_LEVELS,
  SUBMISSION_TYPES,
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

  // Verify state
  const [verifyMode, setVerifyMode] = useState<"upload" | "paste">("upload");
  const [hashInput, setHashInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
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
  }

  // --- Verify handlers ---

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName(null);
      setFileHash(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setVerifyError("Only PDF files are accepted.");
      setFileName(null);
      setFileHash(null);
      return;
    }
    setFileName(file.name);
    setVerifyError("");
    setVerifyResult(null);
    const hash = await hashFile(file);
    setFileHash(hash);
    if (fileRef.current) fileRef.current.value = "";
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
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg text-white">
            Search the Registry
          </h2>
        </div>

        <form onSubmit={handleSearch} className="space-y-4 p-6">
          {/* Keyword */}
          <Input
            id="search-query"
            label="Keyword (title or author)"
            placeholder="Search by title or author name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Filter row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              id="search-level"
              label="Level"
              options={[...THESIS_LEVELS]}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            />
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
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-xs border border-border bg-surface px-3 py-2 font-mono text-sm text-white/90 focus:border-accent focus:outline-none"
                />
                <span className="font-mono text-xs text-white/40">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-xs border border-border bg-surface px-3 py-2 font-mono text-sm text-white/90 focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={searchLoading}>
              {searchLoading ? "Searching…" : "Search"}
            </Button>
            <Button type="button" variant="secondary" onClick={clearSearch}>
              Clear
            </Button>
          </div>
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
                        Date
                      </th>
                      <th className="px-6 py-3 font-mono text-xs uppercase text-white/40">
                        Status
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
                    {searchResults.map((thesis) => (
                      <tr
                        key={thesis.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="max-w-48 truncate px-6 py-4 font-mono text-sm text-white/90">
                          {thesis.title}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                          {thesis.author_name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm capitalize text-white/60">
                          {thesis.thesis_level}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                          {thesis.thesis_category}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm capitalize text-white/60">
                          {thesis.submission_type}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                          {new Date(
                            thesis.registered_at,
                          ).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <StatusChip status={thesis.status} />
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
                          {currentUserId && thesis.user_id !== currentUserId && (
                            <DisputeButton thesisId={thesis.id} />
                          )}
                        </td>
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
          {/* Mode Toggle */}
          <div className="mb-6 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setVerifyMode("upload");
                clearVerify();
              }}
              className={`rounded-xs px-4 py-2 font-mono text-sm transition-opacity ${
                verifyMode === "upload"
                  ? "bg-accent text-white"
                  : "bg-surface text-white/60 border border-border hover:bg-border/50"
              }`}
            >
              Upload PDF
            </button>
            <button
              type="button"
              onClick={() => {
                setVerifyMode("paste");
                clearVerify();
              }}
              className={`rounded-xs px-4 py-2 font-mono text-sm transition-opacity ${
                verifyMode === "paste"
                  ? "bg-accent text-white"
                  : "bg-surface text-white/60 border border-border hover:bg-border/50"
              }`}
            >
              Paste Hash
            </button>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {verifyMode === "upload" ? (
              <div className="flex flex-col gap-2">
                <label className="font-mono text-sm text-white/60">
                  Upload PDF to verify
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileRef.current?.click()}
                  >
                    Choose File
                  </Button>
                  <span className="truncate font-mono text-sm text-white/60">
                    {fileName || "No file selected"}
                  </span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {fileHash && (
                  <div className="mt-1 font-mono text-xs text-white/40">
                    SHA-256: <HashDisplay hash={fileHash} />
                  </div>
                )}
              </div>
            ) : (
              <Input
                id="hash-input"
                label="SHA-256 Hash"
                placeholder="Enter 64-character hex hash…"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                maxLength={64}
              />
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={verifyLoading}>
                {verifyLoading ? "Verifying…" : "Verify"}
              </Button>
              <Button type="button" variant="secondary" onClick={clearVerify}>
                Clear
              </Button>
            </div>
          </form>

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
