"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { generateCertificate, type CertificateData } from "@/lib/certificate";
import { createClient } from "@/lib/supabase/client";

interface CertificateButtonProps {
  thesis: CertificateData;
  className?: string;
}

export function CertificateButton({ thesis, className }: CertificateButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const doc = await generateCertificate(thesis);
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
      {loading ? "Generating…" : "Download Certificate"}
    </Button>
  );
}
