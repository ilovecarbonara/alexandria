"use client";

import dynamic from "next/dynamic";
import type { CertificateData } from "@/lib/certificate";

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
}

export function ThesisActions({ thesisId, thesis }: ThesisActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <CertificateButton thesis={thesis} className="text-xs px-2 py-1" />
    </div>
  );
}
