"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { CertificateData } from "@/lib/certificate";
import { Modal, Button } from "@/components/ui";
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
    <div className="flex items-center gap-2 whitespace-nowrap">
      <CertificateButton thesisId={thesisId} thesis={thesis} className="text-xs px-2 py-1 inline-flex items-center gap-1.5" />
      {hasVersionChain && (
        <>
          <Button
            variant="secondary"
            onClick={() => setHistoryOpen(true)}
            className="text-xs px-2 py-1 inline-flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            History
          </Button>
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
