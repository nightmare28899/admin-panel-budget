import { useCallback, useState } from "react";
import { processStatementImportAction } from "@/lib/userActions";
import { useSessionRedirect } from "./useSessionRedirect";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";

export function useStatementRetry({
  onRetried,
  setError,
  setNotice,
}: {
  onRetried: () => void | Promise<void>;
  setError: (message?: string) => void;
  setNotice: (message?: string) => void;
}) {
  const { t } = useLocale();
  const redirectIfExpired = useSessionRedirect();
  const [processingId, setProcessingId] = useState<string>();

  const retry = useCallback(
    async (id: string) => {
      setProcessingId(id);
      setError(undefined);
      setNotice(undefined);
      const result = await processStatementImportAction(id);
      setProcessingId(undefined);

      if (redirectIfExpired(result.sessionExpired)) return;
      if (result.error || !result.data) {
        setError(frontendError(result.error, t, "statementProcessFailed"));
        return;
      }

      await onRetried();
      if (result.data.status === "FAILED") {
        setError(
          result.data.failureMessage ||
            result.data.failureCode ||
            t("statementProcessFailed"),
        );
      } else {
        setNotice(
          result.data.status === "NEEDS_REVIEW"
            ? t("statementReady")
            : t("statementProcessingComplete"),
        );
      }
    },
    [onRetried, redirectIfExpired, setError, setNotice, t],
  );

  return { processingId, retry };
}
