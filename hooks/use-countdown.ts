"use client";

import { useEffect, useState } from "react";
import { getApiDateTimeMs } from "@/lib/date-time";

/** Aggiorna ogni secondo finche' il target non e' passato, poi si ferma su "00:00:00". */
export function useCountdown(target?: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) {
      return;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [target]);

  if (!target) {
    return null;
  }

  const targetTime = getApiDateTimeMs(target);

  if (Number.isNaN(targetTime)) {
    return null;
  }

  const diff = targetTime - now;

  if (diff <= 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return days > 0
    ? `${days}g ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
