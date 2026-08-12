"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A media query as React state, without the effect-then-setState round trip
 * that causes a cascading render on mount.
 *
 * The server snapshot is always `false`, so the server renders the
 * "unmatched" branch and the client corrects it during hydration. Callers
 * should pick their query so that `false` is the safe default — e.g. ask
 * "is this a touch device?" rather than "is this a mouse?".
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
