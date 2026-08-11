"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button, Input, Select, Card } from "@/components/ui";
import { HashDisplay } from "@/components/ui";
import {
  THESIS_CATEGORIES,
  THESIS_LEVELS,
  SUBMISSION_TYPES,
  MAX_PDF_FILE_SIZE_MB,
  MAX_PDF_FILE_SIZE_BYTES,
} from "@/lib/constants";
import {
  MAX_AUTHORS,
  MAX_TITLE_LENGTH,
  MAX_AUTHOR_NAME_LENGTH,
  normalizeNameForComparison,
  validateAuthorList,
  validateTitle,
  validateAuthorName,
} from "@/lib/validation";

type FormState = {
  error?: string;
  success?: boolean;
  txHash?: string;
  sha256Hash?: string;
  submissionType?: string;
};

type LinkableThesis = {
  id: string;
  title: string;
  submission_type: string;
  registered_at: string;
};

type Adviser = { id: string; full_name: string };

type SubmitMetadata = {
  fullName?: string;
  linkableTheses?: LinkableThesis[];
  advisers?: Adviser[];
  error?: string;
};

/** What /upload/process gives back once it has read the manuscript. */
type StagedUpload = {
  stagedId: string;
  sha256: string;
  abstract: string;
  keywords: string[];
  confidence: "high" | "low";
  pageCount: number;
};

type UploadPhase = "idle" | "uploading" | "reading" | "ready";

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function titleFromPdfFileName(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE_LENGTH);
}

export default function SubmitThesisPage() {
  const [state, setState] = useState<FormState>({});
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [staged, setStaged] = useState<StagedUpload | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previousThesisId, setPreviousThesisId] = useState("");
  const [linkableTheses, setLinkableTheses] = useState<LinkableThesis[]>([]);
  const [advisers, setAdvisers] = useState<Adviser[]>([]);
  const [adviserId, setAdviserId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [authorNames, setAuthorNames] = useState<string[]>([""]);
  const [title, setTitle] = useState("");
  const [thesisLevel, setThesisLevel] = useState("");
  const [thesisCategory, setThesisCategory] = useState("");
  const [submissionType, setSubmissionType] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    async function loadMetadata() {
      try {
        const response = await fetch("/api/theses/linking", { cache: "no-store" });
        const result = (await response.json()) as SubmitMetadata;

        if (!active) return;

        if (!response.ok) {
          setState({ error: result.error || "Failed to load submission options." });
          return;
        }

        setLinkableTheses(result.linkableTheses ?? []);
        setAdvisers(result.advisers ?? []);
        if (result.fullName) {
          setOwnerName(result.fullName);
          setAuthorNames([result.fullName]);
        }
      } catch {
        if (active) setState({ error: "Failed to load submission options." });
      }
    }

    loadMetadata();
    return () => {
      active = false;
    };
  }, []);

  function validateField(name: string, value: string): string | null {
    return name === "title" ? validateTitle(value) : null;
  }

  function handleFieldBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  }

  function handleFieldChange(name: string, value: string) {
    if (touched[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  }

  function getDuplicateAuthorIndexes(names: string[]): Set<number> {
    const indexesByName = new Map<string, number[]>();
    names.forEach((name, index) => {
      const normalized = normalizeNameForComparison(name);
      if (!normalized) return;
      indexesByName.set(normalized, [...(indexesByName.get(normalized) ?? []), index]);
    });

    const duplicates = new Set<number>();
    for (const indexes of indexesByName.values()) {
      if (indexes.length > 1) indexes.forEach((index) => duplicates.add(index));
    }
    return duplicates;
  }

  function validateAuthorField(index: number, value: string, names = authorNames): string | null {
    const authorError = validateAuthorName(value);
    if (authorError) return authorError;

    return getDuplicateAuthorIndexes(names).has(index)
      ? "Each author must be listed only once."
      : null;
  }

  function authorErrorPatch(names: string[], touchedState: Record<string, boolean>) {
    return Object.fromEntries(
      names
        .map((value, index) => {
          const key = `author-${index}`;
          return touchedState[key]
            ? [key, validateAuthorField(index, value, names)]
            : null;
        })
        .filter((entry): entry is [string, string | null] => entry !== null),
    );
  }

  function reindexAuthorState<T>(state: Record<string, T>, removedIndex: number) {
    const next: Record<string, T> = {};
    for (const [key, value] of Object.entries(state)) {
      const match = /^author-(\d+)$/.exec(key);
      if (!match) {
        next[key] = value;
        continue;
      }

      const authorIndex = Number(match[1]);
      if (authorIndex < removedIndex) next[key] = value;
      if (authorIndex > removedIndex) next[`author-${authorIndex - 1}`] = value;
    }
    return next;
  }

  function handleAuthorChange(index: number, value: string) {
    const next = authorNames.map((name, i) => (i === index ? value : name));
    setAuthorNames(next);
    setFieldErrors((prev) => ({ ...prev, ...authorErrorPatch(next, touched) }));
  }

  function handleAuthorBlur(index: number, value: string) {
    const key = `author-${index}`;
    const nextTouched = { ...touched, [key]: true };
    const nextAuthors = authorNames.map((name, i) => (i === index ? value : name));
    setTouched(nextTouched);
    setFieldErrors((prev) => ({
      ...prev,
      ...authorErrorPatch(nextAuthors, nextTouched),
    }));
  }

  function addAuthor() {
    if (authorNames.length >= MAX_AUTHORS) return;
    setAuthorNames((prev) => [...prev, ""]);
  }

  function removeAuthor(index: number) {
    if (index === 0) return;
    const nextAuthors = authorNames.filter((_, i) => i !== index);
    const nextTouched = reindexAuthorState(touched, index);
    setAuthorNames(nextAuthors);
    setTouched(nextTouched);
    setFieldErrors((prev) => {
      const next = reindexAuthorState(prev, index);
      for (const key of Object.keys(next)) {
        if (/^author-\d+$/.test(key)) delete next[key];
      }
      return { ...next, ...authorErrorPatch(nextAuthors, nextTouched) };
    });
  }

  /**
   * Uploads the manuscript straight to storage, then asks the server to read it.
   *
   * Three hops rather than one: a 25 MB file cannot be POSTed through a
   * serverless function, so the browser uploads to a signed URL and the server
   * fetches it back to hash and parse it.
   */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";

    if (!file) return;

    if (file.type !== "application/pdf") {
      setState({ error: "Only PDF files are accepted." });
      return;
    }
    if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
      setState({
        error: `The manuscript must be ${MAX_PDF_FILE_SIZE_MB} MB or smaller.`,
      });
      return;
    }

    setState({});
    setStaged(null);
    setFileName(file.name);
    setPhase("uploading");

    try {
      const clientHash = await hashFile(file);

      const ticketRes = await fetch("/api/theses/upload/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientHash, sizeBytes: file.size }),
      });
      const ticket = await ticketRes.json();

      if (!ticketRes.ok) {
        setState({ error: ticket.error || "Could not start the upload." });
        setPhase("idle");
        return;
      }

      const putRes = await fetch(ticket.url, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });

      if (!putRes.ok) {
        setState({ error: "The upload did not complete. Please try again." });
        setPhase("idle");
        return;
      }

      setPhase("reading");

      const processRes = await fetch("/api/theses/upload/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientHash, filename: file.name }),
      });
      const processed = await processRes.json();

      if (!processRes.ok) {
        setState({ error: processed.error || "Could not read this manuscript." });
        setPhase("idle");
        setFileName(null);
        return;
      }

      setStaged(processed as StagedUpload);
      setPhase("ready");

      if (!title.trim()) {
        const derived = titleFromPdfFileName(file.name);
        if (derived) {
          setTitle(derived);
          handleFieldChange("title", derived);
        }
      }
    } catch {
      setState({ error: "Network error during upload. Please try again." });
      setPhase("idle");
      setFileName(null);
    }
  }

  const isFinal = submissionType === "final";

  const canSubmit =
    staged !== null &&
    title.trim().length > 0 &&
    thesisLevel.length > 0 &&
    thesisCategory.length > 0 &&
    submissionType.length > 0 &&
    (!isFinal || adviserId.length > 0) &&
    authorNames.every((name) => name.trim().length > 0) &&
    !Object.values(fieldErrors).some(Boolean);

  function resetForm() {
    setState({});
    setStaged(null);
    setPhase("idle");
    setFileName(null);
    setPreviousThesisId("");
    setAdviserId("");
    setAuthorNames(ownerName ? [ownerName] : [""]);
    setTitle("");
    setThesisLevel("");
    setThesisCategory("");
    setSubmissionType("");
    setFieldErrors({});
    setTouched({});
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({});

    if (!staged) {
      setState({ error: "Please upload the manuscript PDF first." });
      return;
    }

    const trimmedAuthors = authorNames.map((name) => name.trim());

    const authorError = validateAuthorList(trimmedAuthors);
    if (authorError) {
      setTouched((prev) => ({
        ...prev,
        ...Object.fromEntries(trimmedAuthors.map((_, index) => [`author-${index}`, true])),
      }));
      setFieldErrors((prev) => ({
        ...prev,
        ...Object.fromEntries(
          trimmedAuthors.map((name, index) => [
            `author-${index}`,
            validateAuthorField(index, name, trimmedAuthors),
          ]),
        ),
      }));
      setState({ error: authorError });
      return;
    }

    if (
      ownerName &&
      !trimmedAuthors.some(
        (name) => normalizeNameForComparison(name) === normalizeNameForComparison(ownerName),
      )
    ) {
      setState({ error: "You must be listed as an author of your own thesis." });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/theses/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stagedId: staged.stagedId,
          title: title.trim(),
          authorNames: trimmedAuthors,
          thesisLevel,
          thesisCategory,
          submissionType,
          adviserId: isFinal ? adviserId : null,
          previousThesisId: previousThesisId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({ error: data.error || "Submission failed." });
      } else {
        setState({
          success: true,
          txHash: data.txHash,
          sha256Hash: staged.sha256,
          submissionType,
        });
      }
    } catch {
      setState({ error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------

  if (state.success) {
    const wasFinal = state.submissionType === "final";
    const adviserName = advisers.find((a) => a.id === adviserId)?.full_name;

    return (
      <div className="mx-auto max-w-xl py-12 px-4">
        <Card>
          <h1 className="font-heading text-2xl text-ink mb-2">
            {wasFinal ? "Submitted for review" : "Draft archived"}
          </h1>
          <p className="text-sm text-ink-muted mb-6">
            {wasFinal
              ? `Your manuscript is now with ${adviserName ?? "your research adviser"}.`
              : "Your draft is saved to the archive. Only you and the librarian can see it."}
          </p>

          <div className="space-y-4 text-sm">
            {wasFinal && (
              <ol className="space-y-2 border-l-2 border-primary/40 pl-4 text-ink-muted text-xs">
                <li>1. Your adviser reviews the manuscript.</li>
                <li>2. If endorsed, it goes to the university librarian.</li>
                <li>3. Once approved, it is published to the public archive.</li>
              </ol>
            )}

            <div>
              <span className="text-ink-muted">Document fingerprint:</span>
              <div className="mt-1">
                <HashDisplay hash={state.sha256Hash!} copyable />
              </div>
            </div>
            <div>
              <span className="text-ink-muted">Record reference:</span>
              <div className="mt-1">
                <a
                  href={`https://sepolia.etherscan.io/tx/${state.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-ink-muted hover:underline"
                >
                  <HashDisplay hash={state.txHash!} />
                </a>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/dashboard">
                <Button>Go to dashboard</Button>
              </Link>
              <Button variant="secondary" onClick={resetForm}>
                Submit another
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const busy = phase === "uploading" || phase === "reading";

  return (
    <div className="mx-auto max-w-3xl py-12 px-4">
      <Card>
        <h1 className="font-heading text-2xl text-ink mb-1">Submit Thesis</h1>
        <p className="text-sm text-ink-subtle mb-6">
          Upload the manuscript, then confirm its details.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ---- Manuscript ---- */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-ink-muted">
              Manuscript PDF
            </label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {staged ? "Replace file" : "Choose file"}
              </Button>
              <span className="text-sm text-ink-muted truncate">
                {phase === "uploading"
                  ? "Uploading…"
                  : phase === "reading"
                    ? "Reading the abstract…"
                    : (fileName ?? "No file selected")}
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <span className="text-xs text-ink-subtle">
              PDF, up to {MAX_PDF_FILE_SIZE_MB} MB. Must contain selectable text —
              a scan of a printed copy cannot be read.
            </span>
          </div>

          {/* ---- Extracted abstract ---- */}
          {staged && (
            <div className="flex flex-col gap-2 rounded-md border border-border bg-surface/60 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs uppercase text-ink-subtle">
                  Abstract read from your PDF
                </span>
                <span className="text-xs text-ink-subtle">
                  {staged.pageCount} pages
                </span>
              </div>

              {staged.confidence === "low" && (
                <p className="border-l-2 border-warning pl-3 text-xs text-warning">
                  No “ABSTRACT” heading was found, so this is a best guess taken
                  from your front matter. Your adviser can correct it during
                  review.
                </p>
              )}

              <p className="max-h-48 overflow-y-auto text-sm leading-relaxed text-ink">
                {staged.abstract}
              </p>

              {staged.keywords.length > 0 && (
                <p className="text-xs text-ink-subtle">
                  Keywords: {staged.keywords.join(", ")}
                </p>
              )}

              <p className="text-xs text-ink-subtle">
                Taken directly from the manuscript and not editable here. If it
                looks wrong, correct the PDF and upload it again.
              </p>
            </div>
          )}

          <Input
            id="title"
            name="title"
            label="Thesis Title"
            placeholder="Enter thesis title"
            maxLength={MAX_TITLE_LENGTH}
            value={title}
            onBlur={handleFieldBlur}
            onChange={(e) => {
              setTitle(e.target.value);
              handleFieldChange("title", e.target.value);
            }}
            error={fieldErrors.title ?? undefined}
            required
          />

          {/* ---- Authors ---- */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-muted">Authors</span>
              <span className="text-xs text-ink-subtle">
                {authorNames.length}/{MAX_AUTHORS}
              </span>
            </div>
            {authorNames.map((name, index) => (
              <div key={index} className="flex flex-col gap-1">
                {index === 0 ? (
                  <>
                    <label htmlFor="author-0" className="text-sm text-ink-muted">
                      First Author
                    </label>
                    <div className="relative">
                      <input
                        id="author-0"
                        name="author-0"
                        placeholder="Enter author name"
                        maxLength={MAX_AUTHOR_NAME_LENGTH}
                        value={name}
                        readOnly
                        onBlur={(e) => handleAuthorBlur(index, e.target.value)}
                        required
                        className={`w-full rounded-md border border-border bg-surface px-3 py-2 pr-9 text-sm text-ink-muted placeholder:text-ink-subtle focus:border-primary focus:outline-none ${fieldErrors["author-0"] ? "border-danger" : ""}`}
                      />
                      <svg
                        aria-hidden="true"
                        className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <span className="text-xs text-ink-subtle">
                      You&apos;re automatically listed as an author. Co-authors with
                      an Alexandria account can read the full manuscript.
                    </span>
                    {fieldErrors["author-0"] && (
                      <span className="text-xs text-danger">
                        {fieldErrors["author-0"]}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <label
                      htmlFor={`author-${index}`}
                      className="text-sm text-ink-muted"
                    >
                      {`Author ${index + 1}`}
                    </label>
                    <div className="flex items-stretch gap-2">
                      <input
                        id={`author-${index}`}
                        name={`author-${index}`}
                        placeholder="Enter author name"
                        maxLength={MAX_AUTHOR_NAME_LENGTH}
                        value={name}
                        onChange={(e) => handleAuthorChange(index, e.target.value)}
                        onBlur={(e) => handleAuthorBlur(index, e.target.value)}
                        required
                        className={`flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none ${fieldErrors[`author-${index}`] ? "border-danger" : ""}`}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0 px-3 py-2 text-sm leading-none"
                        onClick={() => removeAuthor(index)}
                        aria-label={`Remove author ${index + 1}`}
                      >
                        −
                      </Button>
                    </div>
                    {fieldErrors[`author-${index}`] && (
                      <span className="text-xs text-danger">
                        {fieldErrors[`author-${index}`]}
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-center px-3 py-2 text-sm"
              onClick={addAuthor}
              disabled={authorNames.length >= MAX_AUTHORS}
            >
              + Add author
            </Button>
          </div>

          <Select
            id="thesisLevel"
            name="thesisLevel"
            label="Thesis Level"
            value={thesisLevel}
            onChange={(e) => setThesisLevel(e.target.value)}
            options={THESIS_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
            required
          />

          <Select
            id="thesisCategory"
            name="thesisCategory"
            label="Category"
            value={thesisCategory}
            onChange={(e) => setThesisCategory(e.target.value)}
            options={THESIS_CATEGORIES.map((c) => ({ value: c, label: c }))}
            required
          />

          {/* ---- Submission type ---- */}
          <div className="flex flex-col gap-1">
            <span className="text-sm text-ink-muted">Submission Type</span>
            <div className="flex gap-6">
              {SUBMISSION_TYPES.map((t) => (
                <label
                  key={t.value}
                  className="flex items-center gap-2 text-sm text-ink cursor-pointer"
                >
                  <input
                    type="radio"
                    name="submissionType"
                    value={t.value}
                    checked={submissionType === t.value}
                    onChange={(e) => setSubmissionType(e.target.value)}
                    required
                    className=""
                  />
                  {t.label}
                </label>
              ))}
            </div>
            <span className="text-xs text-ink-subtle">
              {isFinal
                ? "Finals go to your adviser for review, then to the librarian for publication."
                : submissionType === "draft"
                  ? "Drafts are archived privately and skip review. Only you and the librarian can see them."
                  : "Drafts are archived privately. Finals go through adviser and librarian review."}
            </span>
          </div>

          {/* ---- Adviser ---- */}
          {isFinal && (
            <div className="flex flex-col gap-1">
              <Select
                id="adviserId"
                label="Research Adviser"
                placeholder={
                  advisers.length ? "Select your adviser" : "No advisers available"
                }
                value={adviserId}
                onChange={(e) => setAdviserId(e.target.value)}
                options={advisers.map((a) => ({ value: a.id, label: a.full_name }))}
                required
              />
              {advisers.length === 0 && (
                <span className="text-xs text-warning">
                  No research advisers are registered yet. Contact the university
                  librarian before submitting a final manuscript.
                </span>
              )}
            </div>
          )}

          {linkableTheses.length > 0 && (
            <Select
              id="previousThesisId"
              label="This is a revision of"
              placeholder="None — new submission"
              value={previousThesisId}
              onChange={(e) => setPreviousThesisId(e.target.value)}
              options={linkableTheses.map((t) => ({
                value: t.id,
                label: `${t.title.length > 50 ? t.title.slice(0, 50) + "…" : t.title}  [${t.submission_type === "final" ? "Final" : "Draft"}]  ${new Date(t.registered_at).toLocaleDateString()}`,
              }))}
            />
          )}

          {state.error && (
            <p className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || busy || !canSubmit}
            className="w-full"
          >
            {loading
              ? "Submitting…"
              : isFinal
                ? "Submit for adviser review"
                : "Submit"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
