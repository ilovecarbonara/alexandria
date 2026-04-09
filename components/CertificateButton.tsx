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
      const chainResult = await getVersionChain(thesisId);
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
      variant="secondary"
      onClick={handleDownload}
      disabled={loading}
      className={className}
    >
      {loading ? "Generating…" : "Certificate"}
    </Button>
  );
}
