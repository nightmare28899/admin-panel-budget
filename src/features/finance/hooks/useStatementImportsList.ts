import { useCallback, useEffect, useState } from "react";
import { getStatementImportsAction } from "@/lib/userActions";
import type { StatementImportListResponse } from "../statement-import.types";
import { useSessionRedirect } from "./useSessionRedirect";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";

const PAGE_SIZE = 20;

/** The paginated, card-filterable statement import history list. */
export function useStatementImportsList() {
  const { t } = useLocale();
  const redirectIfExpired = useSessionRedirect();
  const [history, setHistory] = useState<StatementImportListResponse>();
  const [page, setPage] = useState(1);
  const [filterCardId, setFilterCardId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (filterCardId) query.set("creditCardId", filterCardId);

    const result = await getStatementImportsAction(query.toString());
    if (redirectIfExpired(result.sessionExpired)) return;

    if (result.error) setError(frontendError(result.error, t, "requestFailedGeneric"));
    else setHistory(result.data);
    setLoading(false);
  }, [page, filterCardId, redirectIfExpired, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const filterByCard = useCallback((cardId: string | undefined) => {
    setFilterCardId(cardId);
    setPage(1);
  }, []);

  /** Re-fetch after an upload/retry: reload in place on page 1, otherwise
   * jump to page 1 (which reloads on its own via the effect above). */
  const reloadFromStart = useCallback(async () => {
    if (page === 1) await reload();
    else setPage(1);
  }, [page, reload]);

  const totalPages = Math.max(1, history?.totalPages ?? 1);

  return {
    history,
    page,
    setPage,
    totalPages,
    filterCardId,
    filterByCard,
    loading,
    error,
    reload,
    reloadFromStart,
  };
}
