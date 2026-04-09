"use client";

import { useState } from "react";
import { StatusChip, HashDisplay, Pagination } from "@/components/ui";
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

export function DashboardRegistrations({
  theses,
  chainParticipantIds,
}: DashboardRegistrationsProps) {
  const [page, setPage] = useState(1);
  const chainParticipants = new Set(chainParticipantIds);
  const totalPages = Math.ceil(theses.length / PAGE_SIZE);
  const paginated = theses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                Title
              </th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                Level
              </th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                Category
              </th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                Type
              </th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                Date
              </th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                Status
              </th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                Tx Hash
              </th>
              <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((thesis) => (
              <tr
                key={thesis.id}
                className="border-b border-border last:border-b-0"
              >
                <td className="max-w-50 truncate px-6 py-4 font-mono text-sm text-white/90">
                  {thesis.title}
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60 capitalize">
                  {thesis.thesis_level}
                </td>
                <td className="max-w-40 truncate px-6 py-4 font-mono text-sm text-white/60">
                  {thesis.thesis_category}
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60 capitalize">
                  {thesis.submission_type}
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                  {new Date(thesis.registered_at).toLocaleDateString()}
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
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </>
  );
}
