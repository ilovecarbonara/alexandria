"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { CertificateData } from "@/lib/certificate";
import { Modal } from "@/components/ui";
import { VersionTimeline } from "@/components/VersionTimeline";

const CertificateButton = dynamic(
  () =>
    import("@/components/CertificateButton").then(
      (mod) => mod.CertificateButton,
    ),
  { ssr: false },
);

interface ThesisActionsProps {
  thesisId: string;
  thesis: CertificateData;
  hasVersionChain?: boolean;
}

export function ThesisActions({
  thesisId,
  thesis,
  hasVersionChain,
}: ThesisActionsProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <CertificateButton thesisId={thesisId} thesis={thesis} className="text-xs px-2 py-1" />
      {hasVersionChain && (
        <>
          <button
            onClick={() => setHistoryOpen(true)}
            className="rounded-xs border border-border bg-surface px-2 py-1 font-mono text-xs text-white/90 transition-opacity hover:bg-border/50"
          >
            History
          </button>
          <Modal
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            title="Version History"
          >
            <VersionTimeline
              thesisId={thesisId}
              currentThesisId={thesisId}
            />
          </Modal>
        </>
      )}
    </div>
  );
}
