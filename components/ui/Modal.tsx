"use client";

import { ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
  );
}

export function Modal({ open, onClose, title, className, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
      // Focus the first focusable element after the dialog renders.
      // requestAnimationFrame ensures children are mounted.
      requestAnimationFrame(() => {
        const focusable = getFocusable(dialog);
        if (focusable.length > 0) focusable[0].focus();
      });
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Keyboard focus trap (Tab / Shift+Tab cycling).
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !dialog) return;
      const focusable = getFocusable(dialog);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !dialog.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={title ? "modal-title" : undefined}
      className="m-auto rounded-lg border border-border bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/25 backdrop:backdrop-blur-[1px]"
    >
      <div className={className ?? "min-w-80 max-w-lg"}>
        {title && (
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 id="modal-title" className="font-heading text-base">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="text-sm text-ink-subtle hover:text-ink"
            >
              ✕
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
      </div>
    </dialog>
  );
}
