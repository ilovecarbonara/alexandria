"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal, Field, StatusChip, HashDisplay, Pagination, Card, Button } from "@/components/ui";
import { ThesisActions } from "@/components/ThesisActions";
import { VersionTimeline } from "@/components/VersionTimeline";
import { formatAuthorNames, getAuthorNames, type ThesisAuthor } from "@/lib/authors";
import { PAGE_SIZE } from "@/lib/constants";
import type { ThesisStatus } from "@/lib/supabase/types";

interface Thesis {
  id: string;
  title: string;
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
          <h2 className="font-heading text-lg text-white">My Registrations</h2>
        </div>
        {theses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-mono text-sm text-white/40">No theses registered yet.</p>
            <Link href="/dashboard/register" className="mt-4 inline-block">
              <Button>Register Your First Thesis</Button>
            </Link>
          </div>
        ) : (
          <>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">Title</th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">Status</th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">Date</th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">Tx Hash</th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">Actions</th>
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
                className="cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-white/5 focus:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <td className="max-w-64 truncate px-6 py-4 font-mono text-sm text-white/90">
                  {thesis.title}
                </td>
                <td className="px-6 py-4">
                  <StatusChip status={thesis.status} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
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
        className={selectedThesis && chainParticipants.has(selectedThesis.id) ? "min-w-[70vw]" : "min-w-[40vw]"}
      >
        {selectedThesis && (
          <div className="space-y-5">
            {chainParticipants.has(selectedThesis.id) ? (
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

                  <div className="flex items-center gap-2 border-t border-border pt-4">
                    <ThesisActions
                      thesisId={selectedThesis.id}
                      thesis={{
                        authorNames: getAuthorNames(selectedThesis.thesis_authors),
                        title: selectedThesis.title,
                        thesisLevel: selectedThesis.thesis_level,
                        thesisCategory: selectedThesis.thesis_category,
                        submissionType: selectedThesis.submission_type,
                        sha256Hash: selectedThesis.sha256_hash,
                        txHash: selectedThesis.tx_hash,
                        blockTimestamp: selectedThesis.block_timestamp,
                      }}
                      status={selectedThesis.status}
                      hasVersionChain
                    />
                  </div>
                </div>

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

                <div className="flex items-center gap-2 border-t border-border pt-4">
                  <ThesisActions
                    thesisId={selectedThesis.id}
                    thesis={{
                      authorNames: getAuthorNames(selectedThesis.thesis_authors),
                      title: selectedThesis.title,
                      thesisLevel: selectedThesis.thesis_level,
                      thesisCategory: selectedThesis.thesis_category,
                      submissionType: selectedThesis.submission_type,
                      sha256Hash: selectedThesis.sha256_hash,
                      txHash: selectedThesis.tx_hash,
                      blockTimestamp: selectedThesis.block_timestamp,
                    }}
                    status={selectedThesis.status}
                    hasVersionChain={false}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
