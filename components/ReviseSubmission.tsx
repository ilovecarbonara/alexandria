"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Modal } from "@/components/ui";
import { ThesisReviewHistory } from "@/components/ThesisReviewHistory";
import { PublicationConsentModal } from "@/components/PublicationConsentModal";
import { acknowledgePublicationNotice } from "@/lib/publication-notice";
import { MAX_PDF_FILE_SIZE_BYTES, MAX_PDF_FILE_SIZE_MB } from "@/lib/constants";
import {
  MAX_AUTHORS,
  MAX_AUTHOR_NAME_LENGTH,
  MAX_TITLE_LENGTH,
  normalizeNameForComparison,
  validateAuthorList,
  validateTitle,
} from "@/lib/validation";

export interface RevisableThesis {
  id: string;
  title: string;
  sha256Hash: string;
  authorNames: string[];
}

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

/**
 * Revising a returned submission.
 *
 * Deliberately not the submit form: the reviewer's comments sit at the top,
 * because they are the reason this screen is open, and only the manuscript,
 * title, and authors can change. Everything else about the thesis is settled.
 */
export function ReviseSubmission({
  thesis,
  ownerName,
  noticeAcknowledged,
  onClose,
}: {
  thesis: RevisableThesis;
  ownerName: string;
  /** Whether the researcher has dismissed the publication consent notice. */
  noticeAcknowledged: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [staged, setStaged] = useState<StagedUpload | null>(null);
  const [title, setTitle] = useState(thesis.title);
  const [authorNames, setAuthorNames] = useState<string[]>(
    thesis.authorNames.length > 0 ? thesis.authorNames : [ownerName],
  );
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(noticeAcknowledged);
  const [consentOpen, setConsentOpen] = useState(false);

  const busy = phase === "uploading" || phase === "reading";

  function updateAuthor(index: number, value: string) {
    setAuthorNames((prev) => prev.map((name, i) => (i === index ? value : name)));
  }

  function addAuthor() {
    if (authorNames.length >= MAX_AUTHORS) return;
    setAuthorNames((prev) => [...prev, ""]);
  }

  function removeAuthor(index: number) {
    if (index === 0) return;
    setAuthorNames((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
      setError(`The manuscript must be ${MAX_PDF_FILE_SIZE_MB} MB or smaller.`);
      return;
    }

    setError(null);
    setStaged(null);
    setFileName(file.name);
    setPhase("uploading");

    try {
      const clientHash = await hashFile(file);

      // Caught here rather than server-side so the message names the real
      // problem: the upload endpoint would only report a duplicate registration.
      if (clientHash === thesis.sha256Hash) {
        setError(
          "This is the same manuscript you submitted before. Upload the corrected version.",
        );
        setPhase("idle");
        setFileName(null);
        return;
      }

      const ticketRes = await fetch("/api/theses/upload/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientHash, sizeBytes: file.size }),
      });
      const ticket = await ticketRes.json();

      if (!ticketRes.ok) {
        setError(ticket.error || "Could not start the upload.");
        setPhase("idle");
        return;
      }

      const putRes = await fetch(ticket.url, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });

      if (!putRes.ok) {
        setError("The upload did not complete. Please try again.");
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
        setError(processed.error || "Could not read this manuscript.");
        setPhase("idle");
        setFileName(null);
        return;
      }

      setStaged(processed as StagedUpload);
      setPhase("ready");
    } catch {
      setError("Network error during upload. Please try again.");
      setPhase("idle");
      setFileName(null);
    }
  }

  const trimmedAuthors = authorNames.map((name) => name.trim());

  const canSubmit =
    staged !== null &&
    title.trim().length > 0 &&
    !titleError &&
    trimmedAuthors.every((name) => name.length > 0);

  function validateForResubmit(): boolean {
    setError(null);

    if (!staged) {
      setError("Upload the corrected manuscript first.");
      return false;
    }

    const titleProblem = validateTitle(title.trim());
    if (titleProblem) {
      setTitleError(titleProblem);
      return false;
    }

    const authorProblem = validateAuthorList(trimmedAuthors);
    if (authorProblem) {
      setError(authorProblem);
      return false;
    }

    if (
      !trimmedAuthors.some(
        (name) =>
          normalizeNameForComparison(name) === normalizeNameForComparison(ownerName),
      )
    ) {
      setError("You must be listed as an author of your own thesis.");
      return false;
    }

    return true;
  }

  async function doResubmit() {
    if (!staged) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/theses/resubmit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thesisId: thesis.id,
          stagedId: staged.stagedId,
          title: title.trim(),
          authorNames: trimmedAuthors,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Resubmission failed.");
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * A revision is always a final headed for publication, so the consent notice
   * applies here too — unless the researcher has already dismissed it.
   */
  async function handleSubmit() {
    if (!validateForResubmit()) return;

    if (!acknowledged) {
      setConsentOpen(true);
      return;
    }

    await doResubmit();
  }

  async function handleConsent(dontShowAgain: boolean) {
    setConsentOpen(false);

    if (dontShowAgain) {
      // Optimistic: a failed preference write only means the notice returns
      // next time, and the consent itself has already been given.
      setAcknowledged(true);
      void acknowledgePublicationNotice();
    }

    await doResubmit();
  }

  return (
    <>
      {/* Closed rather than stacked while the notice is up: two nested native
          dialogs would fight over the focus trap. */}
      <Modal
        open={!consentOpen}
        onClose={onClose}
        title="Revise submission"
        className="w-160 max-w-[95vw]"
      >
        <div className="space-y-5">
          <div>
            <h3 className="font-heading text-lg text-ink">{thesis.title}</h3>
            <p className="mt-1 text-xs text-ink-subtle">
              Returned for revision. Your adviser sees this again once you resubmit.
            </p>
          </div>

          {/* The reason this screen is open, so it leads. */}
          <div className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning-soft p-4">
            <span className="text-xs uppercase text-warning">
              Reviewer comments
            </span>
            <ThesisReviewHistory thesisId={thesis.id} />
          </div>

          {/* ---- Corrected manuscript ---- */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-ink-muted">Corrected manuscript</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={busy || submitting}
                onClick={() => fileRef.current?.click()}
              >
                {staged ? "Replace file" : "Choose file"}
              </Button>
              <span className="truncate text-sm text-ink-muted">
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
              PDF, up to {MAX_PDF_FILE_SIZE_MB} MB. It must differ from the
              manuscript you submitted before.
            </span>
          </div>

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

              <p className="max-h-40 overflow-y-auto text-sm leading-relaxed text-ink">
                {staged.abstract}
              </p>
            </div>
          )}

          <Input
            id="revise-title"
            name="title"
            label="Thesis Title"
            maxLength={MAX_TITLE_LENGTH}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError(validateTitle(e.target.value));
            }}
            onBlur={(e) => setTitleError(validateTitle(e.target.value))}
            error={titleError ?? undefined}
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
              <div key={index} className="flex items-stretch gap-2">
                <input
                  aria-label={index === 0 ? "First author" : `Author ${index + 1}`}
                  maxLength={MAX_AUTHOR_NAME_LENGTH}
                  value={name}
                  readOnly={index === 0}
                  onChange={(e) => updateAuthor(index, e.target.value)}
                  placeholder="Enter author name"
                  className={`flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-ink-subtle focus:border-primary focus:outline-none ${
                    index === 0 ? "text-ink-muted" : "text-ink"
                  }`}
                />
                {index > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 px-3 py-2 text-sm leading-none"
                    onClick={() => removeAuthor(index)}
                    aria-label={`Remove author ${index + 1}`}
                  >
                    −
                  </Button>
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

          {error && (
            <p className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-3 border-t border-border pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting || busy}
            >
              {submitting ? "Resubmitting…" : "Resubmit for adviser review"}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <PublicationConsentModal
        open={consentOpen}
        onConsent={handleConsent}
        onCancel={() => setConsentOpen(false)}
        confirmLabel="I consent — resubmit for review"
      />
    </>
  );
}
