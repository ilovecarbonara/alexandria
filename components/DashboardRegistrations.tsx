"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal, Field, StatusChip, HashDisplay, Pagination, Card, Button } from "@/components/ui";
import { AuthorNamesStack } from "@/components/AuthorNames";
import { ThesisActions } from "@/components/ThesisActions";
import { VersionTimeline } from "@/components/VersionTimeline";
import { ReviewTimeline } from "@/components/ReviewTimeline";
import { ThesisReviewHistory } from "@/components/ThesisReviewHistory";
import { getAuthorNames, type ThesisAuthor } from "@/lib/authors";
import { PAGE_SIZE } from "@/lib/constants";
import type { ThesisStatus } from "@/lib/supabase/types";

interface Thesis {
  id: string;
  title: string;
  abstract: string | null;
  thesis_authors: ThesisAuthor[];
  thesis_level: string;
  thesis_category: string;
  submission_type: string;
  sha256_hash: string;
  tx_hash: string;
  block_timestamp: string;
  status: ThesisStatus;
  registered_at: string;
}

interface DashboardRegistrationsProps {
  theses: Thesis[];
  chainParticipantIds: string[];
}

/**
 * The body of the detail modal. Shared by the plain and version-chain layouts,
 * which are otherwise identical.
 */
function ThesisDetailBody({
  thesis,
  hasVersionChain,
}: {
  thesis: Thesis;
  hasVersionChain: boolean;
}) {
  return (
    <div className="space-y-5">
      <AuthorNamesStack authors={thesis.thesis_authors} />

      <ReviewTimeline status={thesis.status} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title" value={thesis.title} />
        <Field label="Level" value={thesis.thesis_level} capitalize />
        <Field label="Category" value={thesis.thesis_category} />
        <Field label="Submission Type" value={thesis.submission_type} capitalize />
        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-subtle">Status</span>
          <StatusChip status={thesis.status} />
        </div>
        <Field
          label="Submitted"
          value={new Date(thesis.registered_at).toLocaleString()}
        />
      </div>

      {thesis.abstract && (
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-ink-subtle">
            Abstract
          </span>
          <p className="max-h-40 overflow-y-auto rounded-md border border-border bg-surface/60 p-3 text-sm leading-relaxed text-ink">
            {thesis.abstract}
          </p>
        </div>
      )}

      {/* Reviewer feedback — the reason a returned submission is actionable. */}
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="text-xs uppercase text-ink-subtle">
          Review history
        </span>
        <ThesisReviewHistory thesisId={thesis.id} />
      </div>

      {/* The blockchain record, kept out of the way of the academic detail. */}
      <details className="border-t border-border pt-4">
        <summary className="cursor-pointer text-xs uppercase text-ink-subtle hover:text-ink-muted">
          Record integrity
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-ink-subtle">
              Document fingerprint
            </span>
            <HashDisplay hash={thesis.sha256_hash} copyable />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-ink-subtle">
              Record reference
            </span>
            <a
              href={`https://sepolia.etherscan.io/tx/${thesis.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              <HashDisplay hash={thesis.tx_hash} />
            </a>
          </div>
        </div>
      </details>

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <ThesisActions
          thesisId={thesis.id}
          thesis={{
            authorNames: getAuthorNames(thesis.thesis_authors),
            title: thesis.title,
            thesisLevel: thesis.thesis_level,
            thesisCategory: thesis.thesis_category,
            submissionType: thesis.submission_type,
            sha256Hash: thesis.sha256_hash,
            txHash: thesis.tx_hash,
            blockTimestamp: thesis.block_timestamp,
          }}
          status={thesis.status}
          hasVersionChain={hasVersionChain}
        />
      </div>
    </div>
  );
}

export function DashboardRegistrations({
  theses,
  chainParticipantIds,
}: DashboardRegistrationsProps) {
  const [page, setPage] = useState(1);
  const [selectedThesis, setSelectedThesis] = useState<Thesis | null>(null);
  const chainParticipants = new Set(chainParticipantIds);
  const totalPages = Math.ceil(theses.length / PAGE_SIZE);
  const paginated = theses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <Card className="p-0">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg text-ink">My Submissions</h2>
        </div>
        {theses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-ink-subtle">
              You haven&apos;t submitted a thesis yet.
            </p>
            <Link href="/dashboard/submit" className="mt-4 inline-block">
              <Button>Submit Your First Thesis</Button>
            </Link>
          </div>
        ) : (
          <>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-6 py-3 text-xs text-ink-subtle uppercase">Title</th>
              <th className="px-6 py-3 text-xs text-ink-subtle uppercase">Status</th>
              <th className="px-6 py-3 text-xs text-ink-subtle uppercase">Date</th>
              <th className="px-6 py-3 text-xs text-ink-subtle uppercase">Tx Hash</th>
              <th className="px-6 py-3 text-xs text-ink-subtle uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((thesis) => (
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
                className="cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-raised focus:bg-raised focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <td className="max-w-64 truncate px-6 py-4 text-sm text-ink">
                  {thesis.title}
                </td>
                <td className="px-6 py-4">
                  <StatusChip status={thesis.status} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-ink-muted">
                  {new Date(thesis.registered_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${thesis.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    <HashDisplay hash={thesis.tx_hash} />
                  </a>
                </td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <ThesisActions
                    thesisId={thesis.id}
                    thesis={{
                      authorNames: getAuthorNames(thesis.thesis_authors),
                      title: thesis.title,
                      thesisLevel: thesis.thesis_level,
                      thesisCategory: thesis.thesis_category,
                      submissionType: thesis.submission_type,
                      sha256Hash: thesis.sha256_hash,
                      txHash: thesis.tx_hash,
                      blockTimestamp: thesis.block_timestamp,
                    }}
                    status={thesis.status}
                    hasVersionChain={chainParticipants.has(thesis.id)}
                  />
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
                <div className="min-w-0 flex-1">
                  <ThesisDetailBody thesis={selectedThesis} hasVersionChain />
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
              <ThesisDetailBody thesis={selectedThesis} hasVersionChain={false} />
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
