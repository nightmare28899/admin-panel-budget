import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getDetectedPurchasesAction } from "@/lib/userActions";
import { frontendError } from "@/i18n/errors";
import { useLocale } from "@/i18n/LocaleProvider";
import type { DetectedPurchaseListResponse } from "../interfaces/detected-purchases";
import { DETECTED_PURCHASES_CHANGED_EVENT } from "../utils/detected-purchases";
import { useSessionRedirect } from "./useSessionRedirect";
import { useAutoRefresh } from "./useAutoRefresh";

/** Fetches the shared approval inbox, keeping the last successful data on errors. */
export function usePendingPurchases({ page = 1, limit = 20, paused = false } = {}) {
  const { t } = useLocale();
  const pathname = usePathname();
  const redirectIfExpired = useSessionRedirect();
  const [data, setData] = useState<DetectedPurchaseListResponse>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
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
  const { refresh, refreshing } = useAutoRefresh(reload, { enabled: !paused });
  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    const onChanged = () => void refresh();
    window.addEventListener(DETECTED_PURCHASES_CHANGED_EVENT, onChanged);
    return () => {
      cancelPending();
      window.clearTimeout(timer);
      window.removeEventListener(DETECTED_PURCHASES_CHANGED_EVENT, onChanged);
    };
  }, [refresh, reload, pathname, cancelPending]);
  return { data, error, loading, refreshing, refresh };
}
