"use client";

import { useState, useTransition } from "react";
import { Card, Button, Modal, StatusChip, Pagination } from "@/components/ui";
import { PAGE_SIZE, MAX_REVIEW_COMMENTS_LENGTH } from "@/lib/constants";
import { formatAuthorNames } from "@/lib/authors";
import type { QueueItem } from "@/lib/actions/reviews";

/**
 * The review surface for both reviewing roles.
 *
 * An adviser endorses or returns; the librarian approves, returns, or rejects.
 * The decision set is passed in rather than branched on internally, so the two
 * queues stay one component.
 */

export type DecisionKind = "endorse" | "return" | "approve" | "reject";

export interface DecisionSpec {
  kind: DecisionKind;
  label: string;
  /** Written comments are mandatory for anything sent back or refused. */
  requiresComments: boolean;
  variant: "primary" | "secondary" | "danger";
  /** Shown above the comment box in the confirmation modal. */
  prompt: string;
}

export const ADVISER_DECISIONS: DecisionSpec[] = [
  {
    kind: "endorse",
    label: "Endorse to librarian",
    requiresComments: false,
    variant: "primary",
    prompt:
      "This manuscript will go to the university librarian for final approval. You may add a note for the record.",
  },
  {
    kind: "return",
    label: "Return for revision",
    requiresComments: true,
    variant: "secondary",
    prompt:
      "Explain what the researcher needs to change. They will see this in full and can resubmit a corrected manuscript.",
  },
];

export const LIBRARIAN_DECISIONS: DecisionSpec[] = [
  {
    kind: "approve",
    label: "Approve and publish",
    requiresComments: false,
    variant: "primary",
    prompt:
      "This manuscript will be published to the public archive. Its metadata and abstract become publicly visible.",
  },
  {
    kind: "return",
    label: "Return for revision",
    requiresComments: true,
    variant: "secondary",
    prompt:
      "Explain what needs to change. The submission goes back to the researcher, who can resubmit to their adviser.",
  },
  {
    kind: "reject",
    label: "Reject",
    requiresComments: true,
    variant: "danger",
    prompt:
      "Rejection is final — the submission cannot be revised afterwards. Give the reason for the record.",
  },
];

interface ReviewQueueProps {
  items: QueueItem[];
  decisions: DecisionSpec[];
  /** Whether the viewer may correct a badly-extracted abstract. */
  canCorrectAbstract: boolean;
  emptyMessage: string;
  onDecision: (
    thesisId: string,
    kind: DecisionKind,
    comments: string,
  ) => Promise<{ error?: string }>;
  onCorrectAbstract?: (
    thesisId: string,
    abstract: string,
  ) => Promise<{ error?: string }>;
}

export function ReviewQueue({
  items,
  decisions,
  canCorrectAbstract,
  emptyMessage,
  onDecision,
  onCorrectAbstract,
}: ReviewQueueProps) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<QueueItem | null>(null);
  const [pending, setPending] = useState<DecisionSpec | null>(null);
  const [comments, setComments] = useState("");
  const [editingAbstract, setEditingAbstract] = useState(false);
  const [abstractDraft, setAbstractDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function closeAll() {
    setOpen(null);
    setPending(null);
    setComments("");
    setEditingAbstract(false);
    setAbstractDraft("");
    setError(null);
  }

  function submitDecision() {
    if (!open || !pending) return;

    const trimmed = comments.trim();
    if (pending.requiresComments && !trimmed) {
      setError("Comments are required for this decision.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await onDecision(open.id, pending.kind, trimmed);
      if (result.error) setError(result.error);
      else closeAll();
    });
  }

  function saveAbstract() {
    if (!open || !onCorrectAbstract) return;

    setError(null);
    startTransition(async () => {
      const result = await onCorrectAbstract(open.id, abstractDraft.trim());
      if (result.error) {
        setError(result.error);
      } else {
        setOpen({ ...open, abstract: abstractDraft.trim(), abstractConfidence: "high" });
        setEditingAbstract(false);
      }
    });
  }

  if (items.length === 0) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-ink-subtle">
          {emptyMessage}
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-6 py-3 text-xs uppercase text-ink-subtle">
                Title
              </th>
              <th className="px-6 py-3 text-xs uppercase text-ink-subtle">
                Authors
              </th>
              <th className="px-6 py-3 text-xs uppercase text-ink-subtle">
                Submitted
              </th>
              <th className="px-6 py-3 text-xs uppercase text-ink-subtle">
                Flags
              </th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item) => (
              <tr
                key={item.id}
                tabIndex={0}
                onClick={() => setOpen(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(item);
                  }
                }}
                className="cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-raised focus:bg-raised focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <td className="max-w-80 truncate px-6 py-3 text-sm text-ink">
                  {item.title}
                </td>
                <td className="max-w-56 truncate px-6 py-3 text-sm text-ink-muted">
                  {item.authors.join(", ")}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm text-ink-muted">
                  {new Date(item.registeredAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-3">
                  <div className="flex flex-wrap gap-2">
                    {item.similarityFlagged && (
                      <span className="border-l-2 border-danger pl-2 text-xs uppercase text-danger">
                        Similar title
                      </span>
                    )}
                    {item.abstractConfidence === "low" && (
                      <span className="border-l-2 border-warning pl-2 text-xs uppercase text-warning">
                        Abstract guessed
                      </span>
                    )}
                    {item.revisionCount > 0 && (
                      <span className="border-l-2 border-border pl-2 text-xs uppercase text-ink-subtle">
                        Revision {item.revisionCount}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>

      {/* ---- Review detail ---- */}
      <Modal
        open={open !== null && pending === null}
        onClose={closeAll}
        title="Review submission"
        className="w-160 max-w-[95vw]"
      >
        {open && (
          <div className="space-y-5">
            <div>
              <h3 className="font-heading text-xl text-ink">{open.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">
                {formatAuthorNames(
                  open.authors.map((name, i) => ({ name, position: i + 1 })),
                )}
              </p>
              <p className="mt-1 text-xs text-ink-subtle">
                Submitted by {open.submitterName} ·{" "}
                {new Date(open.registeredAt).toLocaleString()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StatusChip status={open.status} />
              <span className="text-xs uppercase text-ink-subtle">
                {open.thesisLevel} · {open.thesisCategory}
              </span>
              {open.adviserName && (
                <span className="text-xs text-ink-subtle">
                  Adviser: {open.adviserName}
                </span>
              )}
            </div>

            {open.similarityFlagged && (
              <p className="border-l-2 border-danger bg-danger-soft py-2 pl-3 text-xs text-danger">
                A previously registered thesis has a very similar title. A
                dispute thread has been opened for the parties involved. This is
                advisory — it does not block your decision.
              </p>
            )}

            {/* ---- Abstract ---- */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs uppercase text-ink-subtle">
                  Abstract
                </span>
                {canCorrectAbstract && !editingAbstract && (
                  <button
                    type="button"
                    onClick={() => {
                      setAbstractDraft(open.abstract ?? "");
                      setEditingAbstract(true);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Correct abstract
                  </button>
                )}
              </div>

              {open.abstractConfidence === "low" && !editingAbstract && (
                <p className="border-l-2 border-warning pl-3 text-xs text-warning">
                  No “ABSTRACT” heading was found in the PDF; this was inferred
                  from the front matter. Please check it against the manuscript.
                </p>
              )}

              {editingAbstract ? (
                <div className="space-y-2">
                  <textarea
                    value={abstractDraft}
                    onChange={(e) => setAbstractDraft(e.target.value)}
                    rows={10}
                    maxLength={8000}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveAbstract} disabled={isPending}>
                      Save abstract
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setEditingAbstract(false)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="max-h-64 overflow-y-auto rounded-md border border-border bg-surface/60 p-4 text-sm leading-relaxed text-ink">
                  {open.abstract ?? "No abstract on file."}
                </p>
              )}
            </div>

            <a
              href={`/api/theses/${open.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md border border-primary/40 bg-primary-soft px-4 py-2 text-sm text-primary hover:bg-primary-soft"
            >
              Open full manuscript ↗
            </a>

            {error && (
              <p className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3 border-t border-border pt-4">
              {decisions.map((decision) => (
                <Button
                  key={decision.kind}
                  variant={decision.variant}
                  disabled={isPending}
                  onClick={() => {
                    setPending(decision);
                    setComments("");
                    setError(null);
                  }}
                >
                  {decision.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ---- Decision confirmation ---- */}
      <Modal
        open={pending !== null}
        onClose={() => {
          setPending(null);
          setError(null);
        }}
        title={pending?.label ?? ""}
      >
        {pending && open && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">{pending.prompt}</p>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="review-comments"
                className="text-xs uppercase text-ink-subtle"
              >
                {pending.requiresComments ? "Comments (required)" : "Note (optional)"}
              </label>
              <textarea
                id="review-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={6}
                maxLength={MAX_REVIEW_COMMENTS_LENGTH}
                autoFocus
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
              />
              <span
                className={`self-end text-xs ${
                  comments.length > MAX_REVIEW_COMMENTS_LENGTH - 200
                    ? "text-danger"
                    : "text-ink-subtle"
                }`}
              >
                {comments.length}/{MAX_REVIEW_COMMENTS_LENGTH}
              </span>
            </div>

            {error && (
              <p className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                variant={pending.variant}
                onClick={submitDecision}
                disabled={isPending}
              >
                {isPending ? "Saving…" : `Confirm — ${pending.label}`}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPending(null);
                  setError(null);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
