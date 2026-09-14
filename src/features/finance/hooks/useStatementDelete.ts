import { useCallback, useState } from "react";
import { deleteStatementImportAction } from "@/lib/userActions";
import { useSessionRedirect } from "./useSessionRedirect";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";
import type { StatementImportListItem } from "../statement-import.types";

/**
 * Destructive delete for a statement import (record + stored PDF), gated by
 * a confirmation dialog. `target` holds the item awaiting confirmation so
 * the caller can render its name in the confirm description.
 */
export function useStatementDelete({
  onDeleted,
  setError,
  setNotice,
}: {
  onDeleted: () => void | Promise<void>;
  setError: (message?: string) => void;
  setNotice: (message?: string) => void;
}) {
  const { t } = useLocale();
  const redirectIfExpired = useSessionRedirect();
  const [target, setTarget] = useState<StatementImportListItem>();
  const [deleting, setDeleting] = useState(false);

  const requestDelete = useCallback((statementImport: StatementImportListItem) => {
    setTarget(statementImport);
  }, []);

  const cancelDelete = useCallback(() => {
    setTarget(undefined);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!target) return;
    setDeleting(true);
    setError(undefined);
    setNotice(undefined);
    const result = await deleteStatementImportAction(target.id);
    setDeleting(false);

    if (redirectIfExpired(result.sessionExpired)) return;
    if (result.error || !result.data) {
      setError(frontendError(result.error, t, "statementDeleteFailed"));
      return;
    }

    setTarget(undefined);
    await onDeleted();
    setNotice(t("statementDeleted"));
  }, [target, onDeleted, redirectIfExpired, setError, setNotice, t]);

  return { target, deleting, requestDelete, cancelDelete, confirmDelete };
}
