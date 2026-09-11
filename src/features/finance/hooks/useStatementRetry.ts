import { useCallback, useState } from "react";
import { processStatementImportAction } from "@/lib/userActions";
import { useSessionRedirect } from "./useSessionRedirect";

export function useStatementRetry({
  onRetried,
  setError,
  setNotice,
}: {
  onRetried: () => void | Promise<void>;
  setError: (message?: string) => void;
  setNotice: (message?: string) => void;
}) {
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
        setError(result.error ?? "The statement could not be processed.");
        return;
      }

      await onRetried();
      if (result.data.status === "FAILED") {
        setError(
          result.data.failureMessage ||
            result.data.failureCode ||
            "The statement could not be processed.",
        );
      } else {
        setNotice(
          result.data.status === "NEEDS_REVIEW"
            ? "Statement processed successfully and is ready for review."
            : "Statement processing completed.",
        );
      }
    },
    [onRetried, redirectIfExpired, setError, setNotice],
  );

  return { processingId, retry };
}
