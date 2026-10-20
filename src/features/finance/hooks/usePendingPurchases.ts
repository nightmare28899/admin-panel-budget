import { useCallback, useEffect, useRef, useState } from "react";
import { getDetectedPurchasesAction } from "@/lib/userActions";
import { frontendError } from "@/i18n/errors";
import { useLocale } from "@/i18n/LocaleProvider";
import type { DetectedPurchaseListResponse } from "../interfaces/detected-purchases";
import { DETECTED_PURCHASES_CHANGED_EVENT } from "../utils/detected-purchases";
import { useSessionRedirect } from "./useSessionRedirect";
import { useAutoRefresh } from "./useAutoRefresh";
import { useFinanceContext } from "../FinanceContext";

/**
 * Fetches the shared approval inbox, keeping the last successful data on errors.
 * Every successful response publishes its total to FinanceContext (sidebar badge),
 * so a second instance is only needed where no list is mounted: pass `disabled`
 * to make an instance fully idle (no fetch, no events, no polling) while another
 * instance already covers the same data.
 */
export function usePendingPurchases({ page = 1, limit = 20, paused = false, disabled = false } = {}) {
  const { setPendingCount } = useFinanceContext();
  const { t } = useLocale();
  const redirectIfExpired = useSessionRedirect();
  const [data, setData] = useState<DetectedPurchaseListResponse>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const disabledRef = useRef(disabled);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  const cancelPending = useCallback(() => { generation.current += 1; }, []);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    try {
      const result = await getDetectedPurchasesAction(page, limit);
      if (request !== generation.current || redirectIfExpired(result.sessionExpired)) return;
      if (result.error || !result.data) setError(frontendError(result.error, t, "requestFailedGeneric"));
      else { setData(result.data); setError(undefined); }
    } catch {
      if (request === generation.current) setError(t("requestFailedGeneric"));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [page, limit, redirectIfExpired, t]);
  const { refresh, refreshing } = useAutoRefresh(reload, { enabled: !paused && !disabled });
  const totalCount = data?.pagination.totalCount;
  useEffect(() => {
    if (totalCount !== undefined) setPendingCount(totalCount);
  }, [totalCount, setPendingCount]);
  useEffect(() => {
    // `disabled` is read through a ref on purpose: toggling it must not refetch
    // (the instance that was active already published the same data).
    const timer = window.setTimeout(() => { if (!disabledRef.current) void reload(); }, 0);
    const onChanged = () => { if (!disabledRef.current) void refresh(); };
    window.addEventListener(DETECTED_PURCHASES_CHANGED_EVENT, onChanged);
    return () => {
      cancelPending();
      window.clearTimeout(timer);
      window.removeEventListener(DETECTED_PURCHASES_CHANGED_EVENT, onChanged);
    };
  }, [refresh, reload, cancelPending]);
  return { data, error, loading, refreshing, refresh };
}
