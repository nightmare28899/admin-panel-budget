import { useCallback, useState } from "react";
import { processStatementImportAction } from "@/lib/userActions";
import { useSessionRedirect } from "./useSessionRedirect";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";
import { useToast } from "@/components/ui/ToastProvider";

export function useStatementRetry({
  onRetried,
  setError,
}: {
  onRetried: () => void | Promise<void>;
  setError: (message?: string) => void;
}) {
  const { t } = useLocale();
  const toast = useToast();
  const redirectIfExpired = useSessionRedirect();
  const [processingId, setProcessingId] = useState<string>();

  const retry = useCallback(
    async (id: string) => {
      setProcessingId(id);
      setError(undefined);
      try {
        const result = await processStatementImportAction(id);

        if (redirectIfExpired(result.sessionExpired)) return;
        if (result.error || !result.data) {
          const message = frontendError(result.error, t, "statementProcessFailed");
          setError(message);
          toast.error(message);
          return;
        }

        await onRetried();
        if (result.data.status === "FAILED") {
          const message = result.data.failureMessage || result.data.failureCode || t("statementProcessFailed");
          setError(message);
          toast.error(message);
        } else {
          toast.success(
            result.data.status === "NEEDS_REVIEW" ? t("statementReady") : t("statementProcessingComplete"),
          );
        }
      } catch (err) {
        const message = frontendError(err instanceof Error ? err.message : undefined, t, "statementProcessFailed");
        setError(message);
        toast.error(message);
      } finally {
        setProcessingId(undefined);
      }
    },
    [onRetried, redirectIfExpired, setError, toast, t],
  );

  return { processingId, retry };
}
