"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, StatusChip, Modal, Pagination } from "@/components/ui";
import { DisputeThread } from "@/components/DisputeThread";
import {
  getDispute,
  type DisputeSummaryView,
  type DisputeThreadView,
} from "@/lib/actions/disputes";
import { PAGE_SIZE } from "@/lib/constants";

type TabKey = "filed" | "received";

interface DashboardDisputesClientProps {
  filed: DisputeSummaryView[];
  received: DisputeSummaryView[];
}

const ROLE_LABEL = {
  flagger: "Flagger",
  owner: "Owner",
  admin: "Admin",
} as const;

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function summarize(row: DisputeSummaryView): string {
  if (!row.last_message_preview || !row.last_message_role) {
    return "No messages yet.";
  }
  return `${ROLE_LABEL[row.last_message_role]}: ${row.last_message_preview}`;
}

export function DashboardDisputesClient({
  filed,
  received,
}: DashboardDisputesClientProps) {
  const router = useRouter();
  // Persist only the user's explicit tab choice. The effective tab falls back
  // to whichever bucket has rows so a freshly-empty "filed" tab doesn't strand
  // the user on an empty view, but updates as soon as they file something.
  const [view, setView] = useState<{ tab: TabKey | null; page: number }>({
    tab: null,
    page: 1,
  });
  const tab: TabKey =
    view.tab ??
    (filed.length === 0 && received.length > 0 ? "received" : "filed");
  const page = view.page;
  const setPage = (p: number) => setView((v) => ({ ...v, page: p }));
  const switchTab = (next: TabKey) => setView({ tab: next, page: 1 });

  const [openId, setOpenId] = useState<string | null>(null);
  // Bundle the loaded thread with the dispute id it was loaded for so we
  // can derive thread/error state without calling setState synchronously
  // inside the loading effect.
  const [loaded, setLoaded] = useState<{
    id: string;
    thread: DisputeThreadView | null;
    error: string | null;
  } | null>(null);
  const [, startTransition] = useTransition();

  const rows = tab === "filed" ? filed : received;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginated = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const thread = loaded && loaded.id === openId ? loaded.thread : null;
  const loadError = loaded && loaded.id === openId ? loaded.error : null;

  // Load the selected thread whenever the open id changes.
  useEffect(() => {
    if (!openId) return;
    let cancelled = false;
    void getDispute(openId)
      .then((res) => {
        if (cancelled) return;
        if (res.error || !res.data) {
          setLoaded({
            id: openId,
            thread: null,
            error: res.error ?? "Failed to load dispute.",
          });
        } else {
          setLoaded({ id: openId, thread: res.data, error: null });
        }
      })
      .catch((e) => {
        console.error("getDispute failed", e);
        if (!cancelled) {
          setLoaded({
            id: openId,
            thread: null,
            error: "Failed to load dispute.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [openId]);

  // Refetch the currently open thread so messages posted from inside the
  // modal (replies, etc.) appear immediately — router.refresh() alone does
  // not update this client-state-held snapshot.
  function refetchThread() {
    const id = openId;
    if (!id) return;
    void getDispute(id)
      .then((res) => {
        if (!res.error && res.data) {
          setLoaded({ id, thread: res.data, error: null });
        }
      })
      .catch((e) => console.error("getDispute (refetch) failed", e));
  }

  function closeModal() {
    setOpenId(null);
    // Refresh the list so the unread badge clears once the thread closes.
    startTransition(() => router.refresh());
  }

  function tabButton(key: TabKey, label: string, count: number) {
    const active = tab === key;
    const unread = (key === "filed" ? filed : received).reduce(
      (acc, r) => acc + r.unread_count,
      0,
    );
    return (
      <button
        type="button"
        onClick={() => switchTab(key)}
        className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${active
          ? "border-primary text-primary"
          : "border-transparent text-ink-subtle hover:text-ink"
          }`}
      >
        <span>
          {label}{" "}
          <span className="text-ink-subtle">({count})</span>
        </span>
        {unread > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-ink">Disputes</h1>
        <p className="mt-1 text-sm text-ink-subtle">
          Threaded conversations with the admin about flagged theses
        </p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {tabButton("filed", "Filed by me", filed.length)}
        {tabButton("received", "On my theses", received.length)}
      </div>

      <Card className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-ink-subtle">
            {tab === "filed"
              ? "You haven't filed any disputes yet."
              : "No one has flagged your theses."}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {paginated.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(row.id)}
                    className="grid w-full grid-cols-[1fr_auto] items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-raised"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm text-ink">
                          {row.thesis_title}
                        </span>
                        {row.unread_count > 0 && (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] leading-none text-white">
                            {row.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-subtle">
                        {tab === "filed" ? "To" : "From"}:{" "}
                        {row.counterparty_display_name}
                      </p>
                      <p className="mt-1 truncate text-xs text-ink-muted">
                        {summarize(row)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusChip status={row.status} />
                      <span className="whitespace-nowrap text-xs text-ink-subtle">
                        {formatRelative(
                          row.last_message_at ?? row.created_at,
                        )}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Modal
        open={openId !== null}
        onClose={closeModal}
        title="Dispute Thread"
        className="w-[70vw] max-w-[70vw] min-w-[20rem]"
      >
        {loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : thread ? (
          <DisputeThread dispute={thread} onChanged={refetchThread} />
        ) : (
          <p className="text-sm text-ink-subtle">Loading thread…</p>
        )}
      </Modal>
    </div>
  );
}
