"use client";

import { Card } from "@/components/ui/Card";
import { useLocale } from "@/i18n/LocaleProvider";
import type { CreditCardOverviewItem, CreditCardPortfolioCurrency } from "./credit-cards.types";

export function StatementDebtSummary({
  card,
  portfolio,
}: {
  card?: CreditCardOverviewItem;
  portfolio?: CreditCardPortfolioCurrency[];
}) {
  const { t, formatDate, formatNumber } = useLocale();
  const money = (value: number | null, currency: string) =>
    value == null
      ? "—"
      : `${currency} ${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!card) {
    return (
      <Card title={t("portfolioDebtSummary")} className="mb-4 !p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(portfolio ?? []).map((summary) => (
            <div key={summary.currency} className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/40 p-3">
              <p className="text-xs font-medium text-[var(--text-3)]">{summary.currency}</p>
              <dl className="mt-2 space-y-1 text-xs text-[var(--text-3)]">
                <div className="flex justify-between gap-3"><dt>{t("closingStatementTotal")}</dt><dd>{money(summary.totalClosingBalance, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("paidTotal")}</dt><dd>{money(summary.totalPaid, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("remainingStatement")}</dt><dd>{money(summary.totalStatementRemainder, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("currentPaymentDue")}</dt><dd>{money(summary.totalCurrentPaymentDue, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("postCloseSpend")}</dt><dd>{money(summary.totalPostCloseSpend, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("projectedNextClose")}</dt><dd>{money(summary.totalProjectedNextCloseAmount, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("nextClosePaymentEstimate")}</dt><dd>{money(summary.totalNextClosePaymentEstimate, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("remainingAfterNextClose")}</dt><dd>{money(summary.totalEstimatedRemainingAfterNextClose, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3 font-semibold text-[var(--text-1)]"><dt>{t("projectedTotalDebt")}</dt><dd>{money(summary.totalProjectedDebt, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("creditLimit")}</dt><dd>{money(summary.totalCreditLimit, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("availableCredit")}</dt><dd>{money(summary.totalAvailableCredit, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("utilization")}</dt><dd>{summary.utilizationPercent == null ? "—" : `${formatNumber(summary.utilizationPercent)}%`}</dd></div>
              </dl>
              <div className="mt-2 space-y-1 text-xs text-[var(--text-3)]">
                {summary.earliestPaymentDueDate && <p>{t("currentPaymentDueDate", { date: formatDate(summary.earliestPaymentDueDate, { dateStyle: "medium" }) })}</p>}
                <p>{t("postCloseExpenseCount", { count: formatNumber(summary.postCloseExpenseCount) })}</p>
                {summary.earliestProjectedNextCloseDate && <p>{t("projectedCloseDate", { date: formatDate(summary.earliestProjectedNextCloseDate, { dateStyle: "medium" }) })}</p>}
              </div>
            </div>
          ))}
          {(portfolio ?? []).length === 0 && <p className="text-sm text-[var(--text-3)]">{t("noDebtSummary")}</p>}
        </div>
        <p className="mt-3 text-xs text-[var(--text-3)]">{t("projectionDisclaimer")}</p>
      </Card>
    );
  }

  const summary = card.statementSummary;
  const metrics = [
    [t("closingStatementTotal"), summary.closingBalance],
    [t("paidTotal"), summary.paidTotal],
    [t("remainingStatement"), summary.remainingStatement],
    [t("currentPaymentDue"), summary.currentPaymentDue],
    [t("postCloseSpend"), summary.postCloseSpend],
    [t("projectedNextClose"), summary.projectedNextCloseAmount],
    [t("nextClosePaymentEstimate"), summary.nextClosePaymentEstimate],
    [t("remainingAfterNextClose"), summary.estimatedRemainingAfterNextClose],
    [t("projectedTotalDebt"), summary.projectedTotalDebt],
    [t("creditLimit"), card.creditStatus.limit],
    [t("availableCredit"), card.creditStatus.availableCredit],
  ] as const;

  return (
    <Card title={t("cardDebtSummary")} className="mb-4 !p-5">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/40 p-3">
            <p className="text-xs text-[var(--text-3)]">{label}</p>
            <p className="mt-1 font-mono text-sm font-semibold text-[var(--text-1)]">{money(value, card.currency)}</p>
          </div>
        ))}
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/40 p-3">
          <p className="text-xs text-[var(--text-3)]">{t("utilization")}</p>
          <p className="mt-1 font-mono text-sm font-semibold text-[var(--text-1)]">
            {card.creditStatus.utilizationPercent == null ? "—" : `${formatNumber(card.creditStatus.utilizationPercent)}%`}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-1 text-xs text-[var(--text-3)]">
        {summary.dueDate && <p>{t("currentPaymentDueDate", { date: formatDate(summary.dueDate, { dateStyle: "medium" }) })}</p>}
        <p>{t("postCloseExpenseCount", { count: formatNumber(summary.postCloseExpenseCount) })}</p>
        {summary.projectedNextCloseDate && <p>{t("projectedCloseDate", { date: formatDate(summary.projectedNextCloseDate, { dateStyle: "medium" }) })}</p>}
        <p>{t("projectionDisclaimer")}</p>
      </div>
    </Card>
  );
}
