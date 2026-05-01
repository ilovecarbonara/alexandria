"use client";

import dynamic from "next/dynamic";
import type { CertificateData } from "@/lib/certificate";
import type { ThesisStatus } from "@/lib/supabase/types";

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
  status?: ThesisStatus;
  hasVersionChain?: boolean;
}

export function ThesisActions({
  thesisId,
  thesis,
  status,
}: ThesisActionsProps) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <CertificateButton
        thesisId={thesisId}
        thesis={thesis}
        status={status}
        className="text-xs px-2 py-1 inline-flex items-center gap-1.5"
      />
    </div>
  );
}
