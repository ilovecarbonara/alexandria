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
      <p className="font-mono text-sm text-white/40">
        Loading version history…
      </p>
    );
  }

  if (error) {
    return <p className="font-mono text-sm text-dispute">{error}</p>;
  }

  if (chain.length <= 1) {
    return (
      <p className="font-mono text-sm text-white/40">No version history.</p>
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
                    ? "border-accent bg-accent"
                    : "border-white/30 bg-transparent"
                }`}
              />
              {!isLast && <div className="w-px flex-1 bg-white/10" />}
            </div>

            {/* Content */}
            <div className={isLast ? "pb-0" : "pb-5"}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-white/40">
                  v{index + 1}
                </span>
                <span
                  className={`inline-block rounded-xs px-1.5 py-0.5 font-mono text-xs uppercase ${
                    entry.submissionType === "final"
                      ? "bg-success/20 text-success"
                      : "bg-pending/20 text-pending"
                  }`}
                >
                  {entry.submissionType}
                </span>
                {isCurrent && (
                  <span className="font-mono text-xs text-accent">
                    current
                  </span>
                )}
              </div>
              <p
                className={`mt-1 font-mono text-sm ${
                  isCurrent ? "text-white" : "text-white/70"
                }`}
              >
                {entry.title}
              </p>
              <div className="mt-1 flex items-center gap-2 font-mono text-xs text-white/40">
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
