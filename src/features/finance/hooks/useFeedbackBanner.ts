import { useCallback, useState } from "react";

/** Transient inline error banner state shown after an action (upload, retry, ...). Success is reported via toast. */
export function useFeedbackBanner() {
  const [error, setError] = useState<string>();

  const clear = useCallback(() => {
    setError(undefined);
  }, []);

  return { error, setError, clear };
}
