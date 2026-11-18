"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { getCutoffPaymentState, groupPendingByCurrency } from "./cardCutoffStatus";
import { listPendingPayments } from "./cardPaymentSchedule";
import type { CreditCardOverviewItem } from "./credit-cards.types";
import { CutoffStatusChip, useCutoffAgo } from "./CutoffStatusChip";

function cardLabel(card: CreditCardOverviewItem) {
  return `${card.bank} · ${card.name} · ${card.last4}`;
}

/** Cards that need attention, sorted by urgency and measured against each card's own cutoff. */
export function CutoffPendingSection({ cards }: { cards: CreditCardOverviewItem[] }) {
  const { t, formatNumber, formatDate } = useLocale();
  const cutoffAgo = useCutoffAgo();
  const pending = useMemo(() => listPendingPayments(cards), [cards]);
  const totals = useMemo(
    () => groupPendingByCurrency(pending.map(({ card }) => ({ card, state: getCutoffPaymentState(card) }))),
    [pending],
  );
  const money = (value: number, currency: string) =>
    `${currency} ${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <section aria-labelledby="cutoff-pending-title" className="mb-8">
      <div className="mb-3">
        <h2 id="cutoff-pending-title" className="text-lg font-bold tracking-tight text-[var(--text-1)]">{t("cutoffPendingTitle")}</h2>
        <p className="mt-0.5 text-xs text-[var(--text-3)]">{t("cutoffPendingDescription")}</p>
      </div>

      {pending.length === 0 ? (
        <p role="status" className="rounded-xl border border-dashed border-[var(--border-soft)] px-4 py-5 text-center text-xs text-[var(--text-3)]">
          {t("cutoffAllClear")}
        </p>
      ) : (
        <>
          <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {totals.map((group) => (
              <div key={group.currency} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-1)] p-4">
                <p className="text-[11px] font-medium text-[var(--text-3)]">{t("pendingStatementPayments")} · {group.currency}</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[var(--text-1)]">
                  {money(group.currentPaymentDue, group.currency)}
                </p>
                <div className="mt-3 space-y-1 border-t border-[var(--border-soft)]/60 pt-3 text-xs text-[var(--text-3)]">
                  <p className="flex justify-between gap-2">
                    <span>{t("minimumPaymentRequired")}</span>
                    <span className="font-mono font-semibold text-[var(--text-2)]">{money(group.minimumPayment, group.currency)}</span>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span>{t("noInterestPayment")}</span>
                    <span className="font-mono font-semibold text-[var(--text-2)]">{money(group.noInterestTarget, group.currency)}</span>
                  </p>
                  {group.nearestDueDate && (
                    <p className="font-medium text-[var(--rose-text)]/90">{t("nextPaymentOn", { date: formatDate(group.nearestDueDate, { dateStyle: "medium" }) })}</p>
                  )}
                  {group.needsStatementCount > 0 && (
                    <p className="font-medium text-[var(--info-text)]">{t("cutoffTotalsNeedStatement", { count: formatNumber(group.needsStatementCount) })}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <ul className="space-y-2">
            {pending.map(({ card, state }) => (
              <li key={card.id} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-1)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-1)]">{cardLabel(card)}</p>
                    {state.lastCutoffDate && (
                      <p className="mt-0.5 text-xs text-[var(--text-3)]">
                        {t("lastCutoff")}: {formatDate(state.lastCutoffDate, { dateStyle: "medium" })}
                        {state.daysSinceCutoff !== null && <> ({cutoffAgo(state.daysSinceCutoff)})</>}
                      </p>
                    )}
                  </div>
                  <CutoffStatusChip status={state.status} />
                </div>

                {state.status === "CUTOFF_NEEDS_STATEMENT" ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-soft)]/60 pt-3">
                    <div className="min-w-0 flex-1 text-xs text-[var(--text-3)]">
                      <p>{t("cutoffNeedsStatementHelp", { date: state.lastCutoffDate ? formatDate(state.lastCutoffDate, { dateStyle: "medium" }) : "—" })}</p>
                      {state.cycleSpendReference != null && state.cycleSpendReference > 0 && (
                        <p className="mt-1">
                          {t("cycleSpendReference")}:{" "}
                          <span className="font-mono text-[var(--text-2)]">{money(state.cycleSpendReference, state.currency)}</span>
                        </p>
                      )}
                    </div>
                    <Link
                      href="/finance/statements"
                      className="whitespace-nowrap rounded-xl border border-sky-500/30 bg-sky-500/15 px-4 py-2 text-xs font-semibold text-[var(--info-text)] transition hover:bg-sky-500/25 focus-visible:outline-2 focus-visible:outline-sky-400"
                    >
                      {t("uploadStatement")}
                    </Link>
                  </div>
                ) : (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--border-soft)]/60 pt-3 text-xs sm:grid-cols-4">
                    <div>
                      <dt className="text-[var(--text-3)]">{t("currentPaymentDue")}</dt>
                      <dd className="font-mono font-semibold text-[var(--text-1)]">{state.currentPaymentDue != null ? money(state.currentPaymentDue, state.currency) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-3)]">{t("minimumPaymentRequired")}</dt>
                      <dd className="font-mono font-semibold text-[var(--text-2)]">{state.minimumPayment != null ? money(state.minimumPayment, state.currency) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-3)]">{t("noInterestPayment")}</dt>
                      <dd className="font-mono font-semibold text-[var(--text-2)]">{state.noInterestTarget != null ? money(state.noInterestTarget, state.currency) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-3)]">{t("paymentDeadline")}</dt>
                      <dd className={`font-semibold ${state.status === "OVERDUE" ? "text-[var(--rose-text)]" : "text-[var(--text-2)]"}`}>
                        {state.dueDate ? formatDate(state.dueDate, { dateStyle: "medium" }) : t("paymentDateNotConfigured")}
                      </dd>
                    </div>
                  </dl>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
