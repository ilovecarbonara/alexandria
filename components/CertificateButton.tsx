"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { generateCertificate, type CertificateData } from "@/lib/certificate";
import { getVersionChain } from "@/lib/actions/theses";
import { createClient } from "@/lib/supabase/client";

interface CertificateButtonProps {
  thesisId: string;
  thesis: CertificateData;
  className?: string;
}

export function CertificateButton({ thesisId, thesis, className }: CertificateButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
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
    <Button
      variant="primary"
      onClick={handleDownload}
      disabled={loading}
      className={className}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
      {loading ? "Generating…" : "Certificate"}
    </Button>
  );
}
