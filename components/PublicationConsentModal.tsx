"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";

/**
 * The consent gate in front of a final submission.
 *
 * A final is the only submission type that can become public — drafts are
 * archived privately and never leave the pipeline — so this appears on the
 * final path only, and says precisely what publication exposes: the record,
 * not the manuscript. Overstating it ("your paper will be posted") would leave
 * researchers believing the PDF becomes a public download, which it does not.
 *
 * Ticking "Don't show again" persists an acknowledgement on the account, so the
 * choice follows the researcher to any device. Consenting without ticking is
 * fine — they are simply asked again next time.
 */
export function PublicationConsentModal({
  open,
  onConsent,
  onCancel,
  confirmLabel = "I consent — submit for review",
}: {
  open: boolean;
  /** `dontShowAgain` is what the researcher ticked, for the caller to persist. */
  onConsent: (dontShowAgain: boolean) => void;
  onCancel: () => void;
  confirmLabel?: string;
}) {
  const [consented, setConsented] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  /**
   * Both exits clear the ticks, so consent is never carried over from a
   * previous opening — cancelling and reopening starts from unticked. Every
   * way of closing this dialog (Esc, backdrop, ✕, Cancel, Confirm) runs through
   * one of these two.
   */
  function cancel() {
    setConsented(false);
    setDontShowAgain(false);
    onCancel();
  }

  function confirm() {
    setConsented(false);
    setDontShowAgain(false);
    onConsent(dontShowAgain);
  }

  return (
    <Modal
      open={open}
      onClose={cancel}
      title="Before you submit"
      className="w-140 max-w-[95vw]"
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Once your adviser endorses this manuscript and the university
          librarian approves it, its record joins the public archive at
          Alexandria.
        </p>

        <div className="rounded-md border border-border bg-surface/60 p-4">
          <span className="text-xs uppercase text-ink-subtle">
            Visible to anyone, including people without an account
          </span>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            <li>• The title</li>
            <li>• Every author you listed</li>
            <li>• The abstract and keywords read from your PDF</li>
            <li>• The thesis level, category, and date of registration</li>
            <li>• The document fingerprint and its blockchain record</li>
          </ul>
        </div>

        <div className="rounded-md border border-border bg-surface/60 p-4">
          <span className="text-xs uppercase text-ink-subtle">
            Stays restricted
          </span>
          <p className="mt-2 text-sm text-ink">
            The full manuscript PDF. Only you, co-authors with an Alexandria
            account, your research adviser, and the university librarian can
            open it — publication does not change that.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="cb mt-0.5"
          />
          <span>
            I consent to my thesis record being published in the public archive
            if it is approved.
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="cb"
          />
          Don&apos;t show again
        </label>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="secondary" onClick={cancel}>
            Cancel
          </Button>
          <Button disabled={!consented} onClick={confirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
