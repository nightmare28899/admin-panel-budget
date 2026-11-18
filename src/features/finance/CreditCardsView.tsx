"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCardsPageSkeleton } from "./CreditCardsPageSkeleton";
import { CreditCardManager } from "./CreditCardManager";
import type { CreditCardWritePayload } from "./credit-cards.types";
import {
  createCreditCardAction,
  deactivateCreditCardAction,
  deleteCreditCardPermanentlyAction,
  reorderCreditCardsAction,
  updateCreditCardAction,
} from "@/lib/userActions";
import { useFinanceContext } from "./FinanceContext";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";
import { useToast } from "@/components/ui/ToastProvider";
import type { MessageKey } from "@/i18n/messages";
import { CREDIT_CARDS_CHANGED_EVENT } from "./creditCardsEvents";

export function CreditCardsView() {
  const router = useRouter();
  const { t } = useLocale();
  const toast = useToast();
  const { sharedOverview: overview, sharedOverviewLoading, setCardOrder } = useFinanceContext();
  const [error, setError] = useState<string>();

  // The overview is loaded by FinanceProvider; one event makes it refetch once.
  const notifyCardsChanged = useCallback(() => {
    window.dispatchEvent(new Event(CREDIT_CARDS_CHANGED_EVENT));
  }, []);

  const reportError = (message: string) => {
    setError(message);
    toast.error(message);
  };

  const reportThrown = (err: unknown) =>
    reportError(frontendError(err instanceof Error ? err.message : undefined, t, "requestFailedGeneric"));

  const refreshAfter = async (
    run: () => Promise<{ error?: string; sessionExpired?: boolean }>,
    successKey: MessageKey,
  ) => {
    setError(undefined);
    try {
      const result = await run();
      if (result.sessionExpired) {
        router.push("/user-login");
        return;
      }
      if (result.error) reportError(frontendError(result.error, t, "requestFailedGeneric"));
      else {
        toast.success(t(successKey));
        notifyCardsChanged();
      }
    } catch (err) {
      reportThrown(err);
    }
  };

  const deletePermanently = async (id: string) => {
    setError(undefined);
    try {
      const result = await deleteCreditCardPermanentlyAction(id);
      if (result.sessionExpired) {
        router.push("/user-login");
        return;
      }
      if (result.error || !result.data) {
        reportError(
          result.errorCode === "CREDIT_CARD_HAS_STATEMENTS"
            ? t("creditCardHasStatements", { count: result.statementCount ?? 0 })
            : frontendError(result.error, t, "requestFailedGeneric"),
        );
        return;
      }
      toast.success(
        t("cardDeletedUnlinked", {
          expenses: result.data.unlinkedExpenses,
          subscriptions: result.data.unlinkedSubscriptions,
        }),
      );
      notifyCardsChanged();
    } catch (err) {
      reportThrown(err);
    }
  };

  // Optimistic: reorder the shared snapshot first, then confirm with the server (no refetch).
  const reorderCards = async (ids: string[]) => {
    setError(undefined);
    const previous = setCardOrder(ids);
    try {
      const result = await reorderCreditCardsAction(ids);
      if (result.sessionExpired) {
        router.push("/user-login");
        return;
      }
      if (result.error || !result.data) {
        setCardOrder(previous);
        reportError(t("cardReorderFailed"));
        return;
      }
      setCardOrder(result.data.map((card) => card.id));
      toast.success(t("cardOrderSaved"));
    } catch {
      setCardOrder(previous);
      reportError(t("cardReorderFailed"));
    }
  };

  const statementPaymentChanged = async (notice?: string) => {
    setError(undefined);
    if (notice) toast.success(notice);
    // The sidebar and the "pending payments" KPI read the same overview data.
    notifyCardsChanged();
  };

  const errorAlert = error ? (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(undefined)}
            aria-label={t("dismissError")}
            className="shrink-0 cursor-pointer text-[var(--rose)]/70 transition-colors hover:text-[var(--rose)]"
          >
            ✕
          </button>
        </div>
  ) : null;

  return (
    <div className="min-h-full w-full p-4 sm:p-6">
      {!overview && !sharedOverviewLoading && (
        <div className="mb-4">
          <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">{t("myCards")}</h1>
          <p className="mt-0.5 text-sm text-[var(--text-3)]">{t("trackCardsDescription")}</p>
        </div>
      )}

      {!overview && errorAlert}

      {sharedOverviewLoading && !overview ? (
        <CreditCardsPageSkeleton />
      ) : overview ? (
        <CreditCardManager
          overview={overview}
          notice={<>{errorAlert}</>}
          onCreate={(body: CreditCardWritePayload) =>
            refreshAfter(() => createCreditCardAction(body), "cardCreated")
          }
          onUpdate={(id, body) => refreshAfter(() => updateCreditCardAction(id, body), "cardUpdated")}
          onDeactivate={(id) => refreshAfter(() => deactivateCreditCardAction(id), "cardDeactivated")}
          onDeletePermanently={deletePermanently}
          onReorder={reorderCards}
          onStatementPaymentChanged={statementPaymentChanged}
          onReactivate={(id) =>
            refreshAfter(() => updateCreditCardAction(id, { isActive: true }), "cardReactivated")
          }
        />
      ) : null}
    </div>
  );
}
