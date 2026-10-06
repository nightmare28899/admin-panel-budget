"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCardsPageSkeleton } from "./CreditCardsPageSkeleton";
import { CreditCardManager } from "./CreditCardManager";
import type { CreditCardOverviewResponse, CreditCardWritePayload } from "./credit-cards.types";
import {
  createCreditCardAction,
  deactivateCreditCardAction,
  deleteCreditCardPermanentlyAction,
  getCreditCardsOverviewAction,
  updateCreditCardAction,
} from "@/lib/userActions";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";
import { CREDIT_CARDS_CHANGED_EVENT } from "./creditCardsEvents";

export function CreditCardsView() {
  const router = useRouter();
  const { t } = useLocale();
  const [overview, setOverview] = useState<CreditCardOverviewResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getCreditCardsOverviewAction("includeInactive=true");

    if (result.sessionExpired) {
      router.push("/user-login");
      return;
    }

    if (result.error) setError(frontendError(result.error, t, "requestFailedGeneric"));
    else setOverview(result.data);
    setLoading(false);
  }, [router, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const refreshAfter = async (result: { error?: string; sessionExpired?: boolean }) => {
    if (result.sessionExpired) {
      router.push("/user-login");
      return;
    }
    if (result.error) setError(frontendError(result.error, t, "requestFailedGeneric"));
    else await load();
  };

  const deletePermanently = async (id: string) => {
    setError(undefined);
    setSuccess(undefined);
    const result = await deleteCreditCardPermanentlyAction(id);
    if (result.sessionExpired) {
      router.push("/user-login");
      return;
    }
    if (result.error || !result.data) {
      setError(
        result.errorCode === "CREDIT_CARD_HAS_STATEMENTS"
          ? t("creditCardHasStatements", { count: result.statementCount ?? 0 })
          : frontendError(result.error, t, "requestFailedGeneric"),
      );
      return;
    }
    setSuccess(
      t("cardDeletedUnlinked", {
        expenses: result.data.unlinkedExpenses,
        subscriptions: result.data.unlinkedSubscriptions,
      }),
    );
    window.dispatchEvent(new Event(CREDIT_CARDS_CHANGED_EVENT));
    await load();
  };

  const statementPaymentChanged = async (notice?: string) => {
    setError(undefined);
    setSuccess(notice);
    // The sidebar and the "pending payments" KPI read the same overview data.
    window.dispatchEvent(new Event(CREDIT_CARDS_CHANGED_EVENT));
    await load();
  };

  const successAlert = success ? (
    <div
      role="status"
      className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
    >
      <span>{success}</span>
      <button
        type="button"
        onClick={() => setSuccess(undefined)}
        aria-label={t("dismissError")}
        className="shrink-0 cursor-pointer text-emerald-300/70 transition-colors hover:text-emerald-300"
      >
        ✕
      </button>
    </div>
  ) : null;

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

  // Full-bleed #080C14 backdrop for this page only: the box-shadow spreads the
  // colour sideways past the max-w column, clip-path trims it vertically.
  return (
    <div className="mx-auto min-h-full w-full max-w-7xl bg-[#080C14] p-4 shadow-[0_0_0_100vmax_#080C14] [clip-path:inset(0_-100vmax)] sm:p-6">
      {!overview && !loading && (
        <div className="mb-4">
          <h1 className="font-serif text-2xl font-semibold text-white">{t("myCards")}</h1>
          <p className="mt-0.5 text-sm text-slate-400">{t("trackCardsDescription")}</p>
        </div>
      )}

      {!overview && errorAlert}
      {!overview && successAlert}

      {loading && !overview ? (
        <CreditCardsPageSkeleton />
      ) : overview ? (
        <CreditCardManager
          overview={overview}
          notice={<>{errorAlert}{successAlert}</>}
          onCreate={async (body: CreditCardWritePayload) =>
            refreshAfter(await createCreditCardAction(body))
          }
          onUpdate={async (id, body) => refreshAfter(await updateCreditCardAction(id, body))}
          onDeactivate={async (id) => refreshAfter(await deactivateCreditCardAction(id))}
          onDeletePermanently={deletePermanently}
          onStatementPaymentChanged={statementPaymentChanged}
          onReactivate={async (id) =>
            refreshAfter(await updateCreditCardAction(id, { isActive: true }))
          }
        />
      ) : null}
    </div>
  );
}
