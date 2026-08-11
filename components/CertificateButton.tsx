"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import { generateCertificate, type CertificateData } from "@/lib/certificate";
import { getVersionChain } from "@/lib/actions/theses";
import { createClient } from "@/lib/supabase/client";
import type { ThesisStatus } from "@/lib/supabase/types";

interface CertificateButtonProps {
  thesisId: string;
  thesis: CertificateData;
  status?: ThesisStatus;
  className?: string;
}

export function CertificateButton({ thesisId, thesis, status, className }: CertificateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  async function handleDownload() {
    if (status === "flagged" && !showWarning) {
      setShowWarning(true);
      return;
    }
    setShowWarning(false);
    setLoading(true);
    try {
      // Fetch version chain and attach to certificate data if chain exists
      const certData = { ...thesis };
      const chainResult = await getVersionChain(thesisId, { includeAllStatuses: true });
      if (chainResult.data && chainResult.data.length > 1) {
        certData.versionHistory = chainResult.data.map((entry) => ({
          submissionType: entry.submissionType,
          sha256Hash: entry.sha256Hash,
          txHash: entry.txHash,
          blockTimestamp: entry.blockTimestamp,
        }));
      }

      const doc = await generateCertificate(certData);
      doc.save(`alexandria-${thesis.sha256Hash.slice(0, 8)}.pdf`);

      // Log activity
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "Certificate generated and downloaded",
        });
      }
    } catch (err) {
      console.error("Certificate generation failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="primary"
        onClick={handleDownload}
        disabled={loading}
        className={className}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        {loading ? "Generating…" : "Certificate"}
      </Button>
      <Modal open={showWarning} onClose={() => setShowWarning(false)} title="Flagged Thesis" className="w-120 max-w-[90vw]">
        <p className="text-sm text-danger text-justify whitespace-normal wrap-break-word">
          This thesis has been flagged and is currently under dispute review.
          The generated certificate will only confirm its blockchain registration
          and cannot be used as proof of verified authorship until the dispute
          is resolved.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowWarning(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleDownload}>
            Continue Download
          </Button>
        </div>
      </Modal>
    </>
  );
}
