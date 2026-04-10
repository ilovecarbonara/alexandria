"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal, StatusChip, HashDisplay, Pagination, Card, Button } from "@/components/ui";
import { ThesisActions } from "@/components/ThesisActions";
import { PAGE_SIZE } from "@/lib/constants";
import type { ThesisStatus } from "@/lib/supabase/types";

interface Thesis {
  id: string;
  title: string;
  author_name: string;
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

const ExpandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
  </svg>
);

export function DashboardRegistrations({
  theses,
  chainParticipantIds,
}: DashboardRegistrationsProps) {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const chainParticipants = new Set(chainParticipantIds);
  const totalPages = Math.ceil(theses.length / PAGE_SIZE);
  const paginated = theses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const modalTotalPages = Math.ceil(theses.length / PAGE_SIZE);
  const modalPaginated = theses.slice((modalPage - 1) * PAGE_SIZE, modalPage * PAGE_SIZE);

  return (
    <>
      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg text-white">My Registrations</h2>
          {theses.length > 0 && (
            <button
              type="button"
              onClick={() => { setModalOpen(true); setModalPage(1); }}
              className="flex items-center gap-1.5 rounded-xs px-2 py-1 font-mono text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
              title="Expand table"
            >
              <ExpandIcon />
              <span>Expand</span>
            </button>
          )}
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
      {/* Collapsed table */}
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
              <tr key={thesis.id} className="border-b border-border last:border-b-0">
                <td className="max-w-64 truncate px-6 py-4 font-mono text-sm text-white/90">
                  {thesis.title}
                </td>
                <td className="px-6 py-4">
                  <StatusChip status={thesis.status} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                  {new Date(thesis.registered_at).toLocaleDateString()}
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
                  <ThesisActions
                    thesisId={thesis.id}
                    thesis={{
                      authorName: thesis.author_name,
                      title: thesis.title,
                      thesisLevel: thesis.thesis_level,
                      thesisCategory: thesis.thesis_category,
                      submissionType: thesis.submission_type,
                      sha256Hash: thesis.sha256_hash,
                      txHash: thesis.tx_hash,
                      blockTimestamp: thesis.block_timestamp,
                    }}
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

      {/* Expanded full-detail modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="My Registrations — Full Details"
        className="w-[95vw] max-w-none"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Title</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Level</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Category</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Type</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Date</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Status</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">SHA-256</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Tx Hash</th>
                <th className="px-4 py-3 font-mono text-xs text-white/40 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modalPaginated.map((thesis) => (
                <tr key={thesis.id} className="border-b border-border last:border-b-0">
                  <td className="max-w-48 truncate px-4 py-3 font-mono text-sm text-white/90">
                    {thesis.title}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-white/60 capitalize">
                    {thesis.thesis_level}
                  </td>
                  <td className="max-w-36 truncate px-4 py-3 font-mono text-sm text-white/60">
                    {thesis.thesis_category}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-white/60 capitalize">
                    {thesis.submission_type}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-white/60">
                    {new Date(thesis.registered_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={thesis.status} />
                  </td>
                  <td className="px-4 py-3">
                    <HashDisplay hash={thesis.sha256_hash} />
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${thesis.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      <HashDisplay hash={thesis.tx_hash} />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <ThesisActions
                      thesisId={thesis.id}
                      thesis={{
                        authorName: thesis.author_name,
                        title: thesis.title,
                        thesisLevel: thesis.thesis_level,
                        thesisCategory: thesis.thesis_category,
                        submissionType: thesis.submission_type,
                        sha256Hash: thesis.sha256_hash,
                        txHash: thesis.tx_hash,
                        blockTimestamp: thesis.block_timestamp,
                      }}
                      hasVersionChain={chainParticipants.has(thesis.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2">
          <Pagination currentPage={modalPage} totalPages={modalTotalPages} onPageChange={setModalPage} />
        </div>
      </Modal>
    </>
  );
}
