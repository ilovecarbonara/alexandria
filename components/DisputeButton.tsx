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
  // Bundle the loaded context with the thesisId it was loaded for, so we
  // can derive `fetchingContext` from request identity instead of calling
  // setState synchronously inside an effect (react-hooks/set-state-in-effect).
  const [fetchedState, setFetchedState] = useState<{
    thesisId: string | null;
    context: { score: number; matchedThesisTitle: string } | null;
  }>({ thesisId: null, context: null });

  const shouldFetch =
    open && fetchSimilarity && !similarityContext && fetchedState.thesisId !== thesisId;
  const fetchingContext = shouldFetch;
  const displayContext =
    similarityContext ??
    (fetchedState.thesisId === thesisId ? fetchedState.context : null);

  useEffect(() => {
    if (!shouldFetch) return;
    let cancelled = false;
    getThesisSimilarityContext(thesisId).then((ctx) => {
      if (cancelled) return;
      setFetchedState({ thesisId, context: ctx });
    });
    return () => { cancelled = true; };
  }, [shouldFetch, thesisId]);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const result = await flagDispute(thesisId, reason);

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
    } catch {
      setError("Could not submit the dispute. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="danger"
        className="text-xs px-2 py-1"
        aria-label="Flag thesis for dispute"
        onClick={() => setOpen(true)}
      >
        Flag
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="File a Dispute" className="min-w-[60vw]">
        {success ? (
          <p className="text-sm text-success">
            Dispute filed. Continue the conversation from your Disputes page.
          </p>
        ) : (
          <div className="space-y-4">
            {fetchingContext && (
              <p className="text-xs text-ink-subtle">
                Loading similarity data…
              </p>
            )}
            {displayContext && (
              <div className="rounded-md border border-border bg-surface/50 px-3 py-2 text-xs space-y-1">
                <div className="text-ink-subtle">
                  Similarity:{" "}
                  <span className="font-mono text-ink-muted">
                    {(displayContext.score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-ink-subtle">
                  Matched thesis:{" "}
                  <span className="text-ink-muted">
                    {displayContext.matchedThesisTitle}
                  </span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="dispute-reason"
                className="text-sm text-ink-muted"
              >
                Opening message
              </label>
              <textarea
                id="dispute-reason"
                placeholder="Describe the issue — the admin and thesis owner will reply in a thread…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={MAX_REASON_LENGTH}
                rows={4}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none resize-y"
              />
              <div className="flex justify-end">
                <span
                  className={`text-xs ${
                    reason.length > 1800
                      ? "text-danger"
                      : "text-ink-subtle"
                  }`}
                >
                  {reason.length}/{MAX_REASON_LENGTH}
                </span>
              </div>
            </div>
            {error && (
              <p className="text-xs text-danger">{error}</p>
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
