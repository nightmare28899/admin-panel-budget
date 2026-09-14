"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ListSkeleton } from "@/components/ui/ContentSkeleton";
import { CreditCardManager } from "./CreditCardManager";
import type { CreditCardOverviewResponse, CreditCardWritePayload } from "./credit-cards.types";
import {
  createCreditCardAction,
  deactivateCreditCardAction,
  getCreditCardsOverviewAction,
  updateCreditCardAction,
} from "@/lib/userActions";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";

export function CreditCardsView() {
  const router = useRouter();
  const { t } = useLocale();
  const [overview, setOverview] = useState<CreditCardOverviewResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

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

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">{t("myCards")}</h1>
        <p className="mt-0.5 text-sm text-[var(--text-3)]">
          {t("trackCardsDescription")}
        </p>
      </div>

      {error && (
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
      )}

      {loading && !overview ? (
        <Card className="!p-4">
          <ListSkeleton />
        </Card>
      ) : overview ? (
        <CreditCardManager
          overview={overview}
          onCreate={async (body: CreditCardWritePayload) =>
            refreshAfter(await createCreditCardAction(body))
          }
          onUpdate={async (id, body) => refreshAfter(await updateCreditCardAction(id, body))}
          onDeactivate={async (id) => refreshAfter(await deactivateCreditCardAction(id))}
          onReactivate={async (id) =>
            refreshAfter(await updateCreditCardAction(id, { isActive: true }))
          }
        />
      ) : null}
    </div>
  );
}
