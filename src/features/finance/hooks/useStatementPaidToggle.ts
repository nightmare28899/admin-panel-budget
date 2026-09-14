import { useCallback, useState } from "react";
import { markStatementImportPaidAction } from "@/lib/userActions";
import { useSessionRedirect } from "./useSessionRedirect";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";

export function useStatementPaidToggle({
  onToggled,
  setError,
  setNotice,
}: {
  onToggled: () => void | Promise<void>;
  setError: (message?: string) => void;
  setNotice: (message?: string) => void;
}) {
  const { t } = useLocale();
  const redirectIfExpired = useSessionRedirect();
  const [togglingId, setTogglingId] = useState<string>();

  const toggle = useCallback(
    async (id: string, isPaid: boolean) => {
      setTogglingId(id);
      setError(undefined);
      const result = await markStatementImportPaidAction(id, isPaid);
      setTogglingId(undefined);

      if (redirectIfExpired(result.sessionExpired)) return;
      if (result.error || !result.data) {
        setError(frontendError(result.error, t, "paidStatusFailed"));
        return;
      }

      await onToggled();
      setNotice(isPaid ? t("markedPaid") : t("markedUnpaid"));
    },
    [onToggled, redirectIfExpired, setError, setNotice, t],
  );

  return { togglingId, toggle };
}
