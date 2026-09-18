"use client";

import { useEffect, useState } from "react";

/**
 * Per differenze di solo-stile CSS basta Tailwind (`sm:`). Serve un hook
 * solo quando cambia il *comportamento* JS in base al viewport (es. il tap
 * su un giocatore apre un bottom sheet su mobile ma non su desktop).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
