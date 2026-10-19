import { useCallback, useState } from "react";
import { confirmDetectedPurchaseAction, discardDetectedPurchaseAction, getCategoriesAction, getCreditCardsAction } from "@/lib/userActions";
import { frontendError } from "@/i18n/errors";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Category, ExpenseWritePayload } from "../finance.types";
import type { CreditCardSummary } from "../statement-import.types";
import { createPurchaseMutationGuard, DETECTED_PURCHASES_CHANGED_EVENT } from "../utils/detected-purchases";
import { useSessionRedirect } from "./useSessionRedirect";

/** Owns approval mutations and the reference data required by the expense form. */
export function usePurchaseApproval() {
  const { t } = useLocale();
  const redirectIfExpired = useSessionRedirect();
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCardSummary[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [referencesError, setReferencesError] = useState<string>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [runExclusive] = useState(createPurchaseMutationGuard);

  const loadReferences = useCallback(async () => {
    setReferencesLoading(true);
    setReferencesError(undefined);
    try {
      const [categoryResult, cardResult] = await Promise.all([getCategoriesAction(), getCreditCardsAction()]);
      if (redirectIfExpired(categoryResult.sessionExpired || cardResult.sessionExpired)) return;
      if (categoryResult.error || cardResult.error || !categoryResult.data || !cardResult.data) {
        setReferencesError(frontendError(categoryResult.error || cardResult.error, t, "requestFailedGeneric"));
      } else { setCategories(categoryResult.data); setCards(cardResult.data.filter((card) => card.isActive)); }
    } catch { setReferencesError(t("requestFailedGeneric")); }
    finally { setReferencesLoading(false); }
  }, [redirectIfExpired, t]);

  const mutate = (id: string, expense?: ExpenseWritePayload) => runExclusive(async () => {
    setSaving(true);
    setError(undefined);
    try {
      const result = expense ? await confirmDetectedPurchaseAction(id, expense) : await discardDetectedPurchaseAction(id);
      if (redirectIfExpired(result.sessionExpired)) return false;
      if (result.error || !result.data) { window.dispatchEvent(new Event(DETECTED_PURCHASES_CHANGED_EVENT)); setError(frontendError(result.error, t, "requestFailedGeneric")); return false; }
      window.dispatchEvent(new Event(DETECTED_PURCHASES_CHANGED_EVENT));
      return true;
    } catch { setError(t("requestFailedGeneric")); return false; }
    finally { setSaving(false); }
  });
  return { categories, cards, referencesLoading, referencesError, loadReferences, saving, error, clearError: () => setError(undefined), mutate };
}
