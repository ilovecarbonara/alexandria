"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, StatusChip } from "@/components/ui";
import {
  postDisputeMessage,
  markDisputeRead,
  type DisputeThreadView,
} from "@/lib/actions/disputes";
import { MAX_REASON_LENGTH } from "@/lib/validation";

interface DisputeThreadProps {
  dispute: DisputeThreadView;
  /**
   * When false, hides the reply composer even if the thread is open. Useful
   * for non-participant admins observing read-only history (not currently
   * exercised, but kept as an explicit override).
   */
  canReply?: boolean;
  /**
   * Invoked after a successful reply post so the parent can refetch the
   * thread and update its own state — `router.refresh()` only re-runs
   * server components, not the parent's client-state-held thread snapshot.
   */
  onChanged?: () => void;
}

const SOFT_LIMIT_WARN = MAX_REASON_LENGTH - 200; // 1800

const ROLE_BADGE: Record<DisputeThreadView["messages"][number]["author_role"], string> = {
  flagger: "border-l-pending text-pending",
  owner: "border-l-accent text-accent",
  admin: "border-l-dispute text-dispute",
};

const ROLE_LABEL: Record<DisputeThreadView["messages"][number]["author_role"], string> = {
  flagger: "Flagger",
  owner: "Owner",
  admin: "Admin",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function DisputeThread({
  dispute,
  canReply = true,
  onChanged,
}: DisputeThreadProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mark the thread as read whenever the latest message id changes.
  // Depending on the last message id (rather than just the dispute id) ensures
  // that re-opening the same thread after new messages have arrived advances
  // the read pointer again — the parent keeps this component mounted across
  // modal close/reopen of the same dispute.
  const lastMessageId = dispute.messages.at(-1)?.id ?? "";
  useEffect(() => {
    void markDisputeRead(dispute.id)
      .then((res) => {
        if (!res.error) router.refresh();
      })
      .catch((e) => console.error("markDisputeRead failed", e));
  }, [dispute.id, lastMessageId, router]);

  // Scroll to the latest message when the message list grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [dispute.messages.length]);

  const isResolved = dispute.status === "resolved";
  const showComposer = canReply && !isResolved;

  async function handlePost() {
    if (!body.trim() || isPending) return;
    setError(null);
    const text = body;
    startTransition(async () => {
      const res = await postDisputeMessage(dispute.id, text);
      if (res.error) {
        setError(res.error);
        return;
      }
      setBody("");
      // Let the parent refetch the thread so the new message appears in this
      // mounted component (router.refresh() only re-runs server components).
      onChanged?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Thread header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase text-white/40">
            Thesis
          </p>
          <p className="truncate font-mono text-sm text-white/90">
            {dispute.thesis_title}
          </p>
          <p className="mt-1 font-mono text-xs text-white/40">
            {dispute.flagger_display_name} → {dispute.owner_display_name}
          </p>
        </div>
        <StatusChip status={dispute.status} />
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto pr-1"
      >
        {dispute.messages.map((m) => {
          const align = m.is_own ? "items-end" : "items-start";
          const bubble = m.is_own
            ? "bg-accent/10 border-accent/30"
            : "bg-surface/60 border-border";
          return (
            <div key={m.id} className={`flex flex-col ${align}`}>
              <div className="flex items-baseline gap-2">
                <span
                  className={`inline-block border-l-2 pl-2 font-mono text-[10px] uppercase ${ROLE_BADGE[m.author_role]}`}
                >
                  {ROLE_LABEL[m.author_role]}
                </span>
                <span className="font-mono text-xs text-white/70">
                  {m.is_own ? "You" : m.author_display_name}
                </span>
                <span className="font-mono text-[10px] text-white/30">
                  {formatTimestamp(m.created_at)}
                </span>
              </div>
              <div
                className={`mt-1 max-w-[85%] whitespace-pre-wrap rounded-xs border px-3 py-2 font-mono text-sm text-white/90 ${bubble}`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer or read-only banner */}
      {isResolved ? (
        <div className="rounded-xs border border-border bg-surface/40 px-3 py-2 font-mono text-xs text-white/50">
          This dispute was resolved
          {dispute.resolved_at
            ? ` on ${new Date(dispute.resolved_at).toLocaleDateString()}`
            : ""}
          . The thread is read-only.
        </div>
      ) : showComposer ? (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`dispute-reply-${dispute.id}`}
            className="font-mono text-xs text-white/40"
          >
            Reply
          </label>
          <textarea
            id={`dispute-reply-${dispute.id}`}
            placeholder="Write a reply…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_REASON_LENGTH}
            rows={3}
            className="resize-y rounded-xs border border-border bg-surface px-3 py-2 font-mono text-sm text-white/90 placeholder:text-white/30 focus:border-accent focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-dispute">
              {error ?? ""}
            </span>
            <span
              className={`font-mono text-xs ${
                body.length > SOFT_LIMIT_WARN ? "text-dispute" : "text-white/30"
              }`}
            >
              {body.length}/{MAX_REASON_LENGTH}
            </span>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handlePost}
              disabled={!body.trim() || isPending}
            >
              {isPending ? "Sending…" : "Send Reply"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
