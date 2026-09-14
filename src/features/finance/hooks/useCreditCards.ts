import { useCallback, useEffect, useState } from "react";
import { getCreditCardsAction } from "@/lib/userActions";
import type { CreditCardSummary } from "../statement-import.types";
import { useSessionRedirect } from "./useSessionRedirect";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";

/** The user's active credit cards — used by both the upload picker and the history filter. */
export function useCreditCards() {
  const { t } = useLocale();
  const redirectIfExpired = useSessionRedirect();
  const [cards, setCards] = useState<CreditCardSummary[]>([]);
  const [cardsError, setCardsError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const result = await getCreditCardsAction();
    if (redirectIfExpired(result.sessionExpired)) return;

    if (result.error) {
      setCards([]);
      setCardsError(frontendError(result.error, t, "requestFailedGeneric"));
    } else {
      setCards(result.data ?? []);
      setCardsError(undefined);
    }
    setLoading(false);
  }, [redirectIfExpired, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  return { cards, cardsError, loading };
}
