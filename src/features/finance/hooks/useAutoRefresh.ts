import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  /** Polling cadence while the document is visible. Default 30 s. */
  intervalMs?: number;
  /** Minimum gap between automatic refreshes (poll, focus, visibility). Default 10 s. */
  minGapMs?: number;
  /** Set to false to pause automatic refreshes (e.g. while a form or dialog is open). */
  enabled?: boolean;
};

/**
 * Keeps data fresh without user action: refreshes when the tab becomes visible
 * or the window regains focus, and polls while the document is visible.
 * Automatic refreshes are throttled, skipped while `enabled` is false and
 * never overlap an in-flight request. The returned `refresh` is for manual
 * triggers: it ignores the throttle and `enabled`, but still never overlaps.
 *
 * `refresh` should keep the caller's filters/pagination and handle its own errors.
 */
export function useAutoRefresh(
  refresh: () => Promise<unknown> | unknown,
  { intervalMs = 30_000, minGapMs = 10_000, enabled = true }: Options = {},
) {
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef(refresh);
  const enabledRef = useRef(enabled);
  const inFlightRef = useRef(false);
  const lastRunRef = useRef(Date.now());

  useEffect(() => {
    refreshRef.current = refresh;
    enabledRef.current = enabled;
  });

  const run = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    lastRunRef.current = Date.now();
    setRefreshing(true);
    try {
      await refreshRef.current();
    } catch {
      // The caller owns error reporting; a failed refresh must not break the timers.
    } finally {
      inFlightRef.current = false;
      lastRunRef.current = Date.now();
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const runIfDue = () => {
      if (document.visibilityState !== "visible") return;
      if (!enabledRef.current || inFlightRef.current) return;
      if (Date.now() - lastRunRef.current < minGapMs) return;
      void run();
    };

    const onVisibility = () => runIfDue();
    const timer = window.setInterval(runIfDue, intervalMs);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", runIfDue);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", runIfDue);
    };
  }, [intervalMs, minGapMs, run]);

  return { refresh: run, refreshing };
}
