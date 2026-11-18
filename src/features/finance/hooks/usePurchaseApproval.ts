import { useCallback, useState } from "react";
import { confirmDetectedPurchaseAction, confirmDetectedPurchaseAsPaymentAction, createSubscriptionAction, discardDetectedPurchaseAction, getCategoriesAction, linkExpensesToSubscriptionAction } from "@/lib/userActions";
import { frontendError } from "@/i18n/errors";
import { useLocale } from "@/i18n/LocaleProvider";
import { useToast } from "@/components/ui/ToastProvider";
import type { Category, ExpenseWritePayload } from "../finance.types";
import { cardPaymentErrorKey, createPurchaseMutationGuard, DETECTED_PURCHASES_CHANGED_EVENT, subscriptionPurchaseExpense } from "../utils/detected-purchases";
import { CREDIT_CARDS_CHANGED_EVENT } from "../creditCardsEvents";
import type { ConfirmAsPaymentPayload, DetectedPurchase } from "../interfaces/detected-purchases";
import type { CreateSubscriptionPayload } from "../subscriptions.types";
import { useSessionRedirect } from "./useSessionRedirect";
import { useFinanceContext } from "../FinanceContext";

/** Owns approval mutations and the reference data required by the expense form. */
export function usePurchaseApproval() {
  const { t } = useLocale();
  const toast = useToast();
  const redirectIfExpired = useSessionRedirect();
  const [categories, setCategories] = useState<Category[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [referencesError, setReferencesError] = useState<string>();
  const [error, setError] = useState<string>();
  const [errorCode, setErrorCode] = useState<string>();
  const [saving, setSaving] = useState(false);
  const fail = (message: string) => {
    setError(message);
    toast.error(message);
  };
  const [runExclusive] = useState(createPurchaseMutationGuard);

  // Cards come from FinanceContext; categories are loaded here (no duplicate endpoint).
  const { sharedCards } = useFinanceContext();

  const loadReferences = useCallback(async () => {
    setReferencesLoading(true);
    setReferencesError(undefined);
    try {
      const categoryResult = await getCategoriesAction();
      if (redirectIfExpired(categoryResult.sessionExpired)) return;
      if (categoryResult.error || !categoryResult.data) {
        setReferencesError(frontendError(categoryResult.error, t, "requestFailedGeneric"));
      } else {
        setCategories(categoryResult.data);
      }
    } catch {
      setReferencesError(t("requestFailedGeneric"));
    }
    finally { setReferencesLoading(false); }
  }, [redirectIfExpired, t]);

  // Cards are already in context; derive active cards from it.
  const cards = sharedCards.filter((card) => card.isActive);

  const mutate = (id: string, expense?: ExpenseWritePayload) => runExclusive(async () => {
    setSaving(true);
    setError(undefined);
    try {
      const result = expense ? await confirmDetectedPurchaseAction(id, expense) : await discardDetectedPurchaseAction(id);
      if (redirectIfExpired(result.sessionExpired)) return false;
      if (result.error || !result.data) { window.dispatchEvent(new Event(DETECTED_PURCHASES_CHANGED_EVENT)); fail(frontendError(result.error, t, "requestFailedGeneric")); return false; }
      window.dispatchEvent(new Event(DETECTED_PURCHASES_CHANGED_EVENT));
      toast.success(t(expense ? "purchaseAcceptedAsExpense" : "purchaseDiscarded"));
      return true;
    } catch (err) { fail(frontendError(err instanceof Error ? err.message : undefined, t, "requestFailedGeneric")); return false; }
    finally { setSaving(false); }
  });
  /** Converts the purchase into a card payment; refreshes the inbox and the card overview via events only. */
  const mutateAsPayment = (id: string, payload: ConfirmAsPaymentPayload) => runExclusive(async () => {
    setSaving(true);
    setError(undefined);
    setErrorCode(undefined);
    try {
      const result = await confirmDetectedPurchaseAsPaymentAction(id, payload);
      if (redirectIfExpired(result.sessionExpired)) return false;
      if (result.error || !result.data) {
        const key = cardPaymentErrorKey(result.errorCode);
        setErrorCode(result.errorCode);
        fail(key ? t(key) : frontendError(result.error, t, "requestFailedGeneric"));
        // Typed errors leave the purchase pending, so no refetch; unknown ones may mean another device resolved it.
        if (!key) window.dispatchEvent(new Event(DETECTED_PURCHASES_CHANGED_EVENT));
        return false;
      }
      window.dispatchEvent(new Event(DETECTED_PURCHASES_CHANGED_EVENT));
      window.dispatchEvent(new Event(CREDIT_CARDS_CHANGED_EVENT));
      toast.success(t("purchaseRegisteredAsPayment"));
      return true;
    } catch (err) { fail(frontendError(err instanceof Error ? err.message : undefined, t, "requestFailedGeneric")); return false; }
    finally { setSaving(false); }
  });
  /**
   * Registers the purchase as an expense (so it leaves the inbox), creates the subscription and links
   * the expense to it. Resolves true when the modal should close and the inbox refresh (including the
   * partial case where only the subscription step failed); false keeps the modal open.
   */
  const mutateAsSubscription = (purchase: DetectedPurchase, subscription: CreateSubscriptionPayload) => runExclusive(async () => {
    setSaving(true);
    setError(undefined);
    try {
      const expense = subscriptionPurchaseExpense(purchase, t("detectedPurchase"), subscription);
      if (!expense) { fail(t("purchaseSubscriptionCategoryRequired")); return false; }
      const confirmed = await confirmDetectedPurchaseAction(purchase.id, expense);
      if (redirectIfExpired(confirmed.sessionExpired)) return false;
      if (confirmed.error || !confirmed.data) {
        // Nothing was created; another device may have resolved the purchase, so refresh the inbox.
        window.dispatchEvent(new Event(DETECTED_PURCHASES_CHANGED_EVENT));
        fail(frontendError(confirmed.error, t, "requestFailedGeneric"));
        return false;
      }
      // The purchase has left the inbox from here on, whatever happens next.
      window.dispatchEvent(new Event(DETECTED_PURCHASES_CHANGED_EVENT));
      let created;
      try { created = await createSubscriptionAction(subscription); }
      catch { created = undefined; }
      if (!created || created.error || !created.data) {
        toast.error(t("purchaseSubscriptionNotCreated"));
        return true;
      }
      const expenseId = confirmed.data.expenseId;
      if (expenseId) {
        let linked;
        try { linked = await linkExpensesToSubscriptionAction(created.data.id, [expenseId]); }
        catch { linked = undefined; }
        if (!linked || linked.error) {
          toast.success(t("purchaseRegisteredAsSubscription"));
          toast.error(t("purchaseSubscriptionLinkFailed"));
          return true;
        }
      }
      toast.success(t("purchaseRegisteredAsSubscription"));
      return true;
    } catch (err) { fail(frontendError(err instanceof Error ? err.message : undefined, t, "requestFailedGeneric")); return false; }
    finally { setSaving(false); }
  });
  return { errorCode, mutateAsPayment, mutateAsSubscription, categories, cards, referencesLoading, referencesError, loadReferences, saving, error, clearError: () => { setError(undefined); setErrorCode(undefined); }, mutate };
}
