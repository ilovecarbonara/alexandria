"use client";

import { useEffect, useState } from "react";
import {
  getVersionChain,
  type VersionChainEntry,
} from "@/lib/actions/theses";
import { HashDisplay } from "@/components/ui";

interface VersionTimelineProps {
  thesisId: string;
  currentThesisId: string;
}

export function VersionTimeline({
  thesisId,
  currentThesisId,
}: VersionTimelineProps) {
  const [chain, setChain] = useState<VersionChainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await getVersionChain(thesisId, { includeAllStatuses: true });
      if (cancelled) return;

      if (result.error) {
        setError(result.error);
      } else {
        setChain(result.data ?? []);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [thesisId]);

  if (loading) {
    return (
      <p className="text-sm text-ink-subtle">
        Loading version history…
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  if (chain.length <= 1) {
    return (
      <p className="text-sm text-ink-subtle">No version history.</p>
    );
  }

  return (
    <div>
      {chain.map((entry, index) => {
        const isCurrent = entry.id === currentThesisId;
        const isLast = index === chain.length - 1;

        return (
          <div key={entry.id} className="flex gap-3">
            {/* Timeline track */}
            <div className="flex flex-col items-center">
              <div
                className={`mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 ${
                  isCurrent
                    ? "border-primary bg-primary"
                    : "border-border bg-transparent"
                }`}
              />
              {!isLast && <div className="w-px flex-1 bg-raised" />}
            </div>

            {/* Content */}
            <div className={isLast ? "pb-0" : "pb-5"}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-subtle">
                  v{index + 1}
                </span>
                <span
                  className={`inline-block rounded-md px-1.5 py-0.5 text-xs uppercase ${
                    entry.submissionType === "final"
                      ? "bg-success-soft text-success"
                      : "bg-warning-soft text-warning"
                  }`}
                >
                  {entry.submissionType}
                </span>
                {isCurrent && (
                  <span className="text-xs text-primary">
                    current
                  </span>
                )}
              </div>
              <p
                className={`mt-1 text-sm ${
                  isCurrent ? "text-ink" : "text-ink-muted"
                }`}
              >
                {entry.title}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-ink-subtle">
                <span>
                  {new Date(entry.registeredAt).toLocaleDateString()}
                </span>
                <span>·</span>
                <HashDisplay hash={entry.sha256Hash} copyable />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
