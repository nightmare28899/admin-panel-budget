import { useCallback, useState } from "react";

/** Transient error/notice banner state shown after an action (upload, retry, ...). */
export function useFeedbackBanner() {
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const clear = useCallback(() => {
    setError(undefined);
    setNotice(undefined);
  }, []);

  return { error, notice, setError, setNotice, clear };
}
