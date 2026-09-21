"use client";

import { useEffect, useRef } from "react";

/**
 * Avviso centrato, ben visibile, che sparisce da solo. Un tocco lo chiude subito.
 */
export function CenterAlert({
  kind,
  message,
  onClose,
  duration = 3200,
}: {
  kind: "success" | "error";
  message: string;
  onClose: () => void;
  duration?: number;
}) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => onCloseRef.current(), duration);
    return () => window.clearTimeout(timeoutId);
  }, [message, duration]);

  const isSuccess = kind === "success";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live="assertive"
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-6 backdrop-blur-[2px]"
    >
      <div
        className={`animate-alert-pop w-full max-w-sm rounded-2xl border bg-[#0F1E2E] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.6)] ${
          isSuccess ? "border-green-500/40" : "border-red-500/40"
        }`}
      >
        <span
          className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
            isSuccess ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
          }`}
        >
          {isSuccess ? (
            <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-10" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v5M12 17h.01" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          )}
        </span>
        <p className="mt-4 text-base font-black leading-snug text-white">{message}</p>
      </div>
    </div>
  );
}
