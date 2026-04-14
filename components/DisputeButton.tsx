"use client";

import { useState, useEffect } from "react";
import { Button, Modal } from "@/components/ui";
import { flagDispute, getThesisSimilarityContext } from "@/lib/actions/disputes";
import { MAX_REASON_LENGTH } from "@/lib/validation";

interface DisputeButtonProps {
  thesisId: string;
  similarityContext?: {
    score: number;
    matchedThesisTitle: string;
  };
  fetchSimilarity?: boolean;
}

export function DisputeButton({
  thesisId,
  similarityContext,
  fetchSimilarity = false,
}: DisputeButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fetchedContext, setFetchedContext] = useState<{
    score: number;
    matchedThesisTitle: string;
  } | null>(null);
  const [fetchingContext, setFetchingContext] = useState(false);

  const displayContext = similarityContext ?? fetchedContext;

  useEffect(() => {
    if (open && fetchSimilarity && !similarityContext && !fetchedContext) {
      setFetchingContext(true);
      getThesisSimilarityContext(thesisId)
        .then((ctx) => setFetchedContext(ctx))
        .finally(() => setFetchingContext(false));
    }
  }, [open, fetchSimilarity, similarityContext, fetchedContext, thesisId]);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const result = await flagDispute(thesisId, reason);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setReason("");
      }, 1500);
    }
  }

  return (
    <>
      <Button
        variant="danger"
        className="text-xs px-2 py-1"
        onClick={() => setOpen(true)}
      >
        Flag
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="File a Dispute" className="min-w-[60vw]">
        {success ? (
          <p className="font-mono text-sm text-success">
            Dispute filed successfully.
          </p>
        ) : (
          <div className="space-y-4">
            {fetchingContext && (
              <p className="font-mono text-xs text-white/30">
                Loading similarity data…
              </p>
            )}
            {displayContext && (
              <div className="rounded-xs border border-border bg-surface/50 px-3 py-2 font-mono text-xs space-y-1">
                <div className="text-white/40">
                  Similarity:{" "}
                  <span className="text-hash">
                    {(displayContext.score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-white/40">
                  Matched thesis:{" "}
                  <span className="text-white/70">
                    {displayContext.matchedThesisTitle}
                  </span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="dispute-reason"
                className="text-sm text-white/60 font-mono"
              >
                Reason
              </label>
              <textarea
                id="dispute-reason"
                placeholder="Describe the issue…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={MAX_REASON_LENGTH}
                rows={4}
                className="rounded-xs border border-border bg-surface px-3 py-2 font-mono text-sm text-white/90 placeholder:text-white/30 focus:border-accent focus:outline-none resize-y"
              />
              <div className="flex justify-end">
                <span
                  className={`font-mono text-xs ${
                    reason.length > 1800
                      ? "text-dispute"
                      : "text-white/30"
                  }`}
                >
                  {reason.length}/{MAX_REASON_LENGTH}
                </span>
              </div>
            </div>
            {error && (
              <p className="font-mono text-xs text-dispute">{error}</p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleSubmit}
                disabled={loading || !reason.trim()}
              >
                {loading ? "Filing…" : "Submit Dispute"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
