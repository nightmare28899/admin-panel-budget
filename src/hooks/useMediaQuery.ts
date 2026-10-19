"use client";

import { useSyncExternalStore } from "react";

/** Tracks a CSS media query; `fallback` is used during SSR and the first hydration pass. */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}
