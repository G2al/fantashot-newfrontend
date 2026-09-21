"use client";

import { useEffect, type ReactNode } from "react";

/** Dialogo di conferma centrato. Chiudere con overlay/Esc equivale a "resta". */
export function ConfirmDialog({
  title,
  description,
  actions,
  onDismiss,
}: {
  title: string;
  description: string;
  actions: ReactNode;
  onDismiss: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[130] flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onDismiss}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="animate-alert-pop relative w-full max-w-sm rounded-2xl border border-[#1E3448] bg-[#0F1E2E] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-400/15 text-amber-400">
          <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        </span>
        <h2 id="confirm-dialog-title" className="mt-4 text-lg font-black text-white">
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{description}</p>
        <div className="mt-5 flex flex-col gap-2">{actions}</div>
      </div>
    </div>
  );
}
