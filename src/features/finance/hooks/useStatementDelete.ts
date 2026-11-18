import { useCallback, useState } from "react";
import { deleteStatementImportAction } from "@/lib/userActions";
import { useSessionRedirect } from "./useSessionRedirect";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";
import { useToast } from "@/components/ui/ToastProvider";
import type { StatementImportListItem } from "../statement-import.types";

/**
 * Destructive delete for a statement import (record + stored PDF), gated by
 * a confirmation dialog. `target` holds the item awaiting confirmation so
 * the caller can render its name in the confirm description.
 */
export function useStatementDelete({
  onDeleted,
  setError,
}: {
  onDeleted: () => void | Promise<void>;
  setError: (message?: string) => void;
}) {
  const { t } = useLocale();
  const toast = useToast();
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
    try {
      const result = await deleteStatementImportAction(target.id);

      if (redirectIfExpired(result.sessionExpired)) return;
      if (result.error || !result.data) {
        const message = frontendError(result.error, t, "statementDeleteFailed");
        setError(message);
        toast.error(message);
        return;
      }

      setTarget(undefined);
      toast.success(t("statementDeleted"));
      await onDeleted();
    } catch (err) {
      const message = frontendError(err instanceof Error ? err.message : undefined, t, "statementDeleteFailed");
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }, [target, onDeleted, redirectIfExpired, setError, toast, t]);

  return { target, deleting, requestDelete, cancelDelete, confirmDelete };
}
