"use client";

import { ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-xs border border-border bg-surface p-0 text-white/90 backdrop:bg-black/60"
    >
      <div className="min-w-80 max-w-lg">
        {title && (
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-heading text-base">{title}</h3>
            <button
              onClick={onClose}
              className="font-mono text-sm text-white/40 hover:text-white/90"
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
