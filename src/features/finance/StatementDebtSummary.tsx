"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { StatementSectionCard } from "./StatementUi";
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
      <StatementSectionCard title={t("portfolioDebtSummary")} className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(portfolio ?? []).map((summary) => (
            <div key={summary.currency} className="rounded-xl border border-slate-800/80 bg-[#0A0F19] p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">{summary.currency}</p>
              <dl className="mt-2 space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between gap-3"><dt>{t("closingStatementTotal")}</dt><dd className="font-mono font-medium text-slate-200">{money(summary.totalClosingBalance, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("paidTotal")}</dt><dd className="font-mono font-medium text-slate-200">{money(summary.totalPaid, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("remainingStatement")}</dt><dd className="font-mono font-medium text-slate-200">{money(summary.totalStatementRemainder, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("currentPaymentDue")}</dt><dd className="font-mono font-medium text-slate-200">{money(summary.totalCurrentPaymentDue, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("postCloseSpend")}</dt><dd className="font-mono font-medium text-slate-200">{money(summary.totalPostCloseSpend, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("projectedNextClose")}</dt><dd className="font-mono font-medium text-slate-200">{money(summary.totalProjectedNextCloseAmount, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("nextClosePaymentEstimate")}</dt><dd className="font-mono font-medium text-slate-200">{money(summary.totalNextClosePaymentEstimate, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("remainingAfterNextClose")}</dt><dd className="font-mono font-medium text-slate-200">{money(summary.totalEstimatedRemainingAfterNextClose, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3 mt-1 border-t border-slate-800/60 pt-1.5 font-semibold text-white"><dt>{t("projectedTotalDebt")}</dt><dd className="font-mono font-bold text-white">{money(summary.totalProjectedDebt, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("creditLimit")}</dt><dd className="font-mono font-medium text-slate-200">{money(summary.totalCreditLimit, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("availableCredit")}</dt><dd className="font-mono font-medium text-slate-200">{money(summary.totalAvailableCredit, summary.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt>{t("utilization")}</dt><dd className="font-mono font-medium text-slate-200">{summary.utilizationPercent == null ? "—" : `${formatNumber(summary.utilizationPercent)}%`}</dd></div>
              </dl>
              <div className="mt-2 space-y-1 text-xs text-slate-400">
                {summary.earliestPaymentDueDate && <p>{t("currentPaymentDueDate", { date: formatDate(summary.earliestPaymentDueDate, { dateStyle: "medium" }) })}</p>}
                <p>{t("postCloseExpenseCount", { count: formatNumber(summary.postCloseExpenseCount) })}</p>
                {summary.earliestProjectedNextCloseDate && <p>{t("projectedCloseDate", { date: formatDate(summary.earliestProjectedNextCloseDate, { dateStyle: "medium" }) })}</p>}
              </div>
            </div>
          ))}
          {(portfolio ?? []).length === 0 && <p className="text-sm text-slate-400">{t("noDebtSummary")}</p>}
        </div>
        <p className="mt-3 text-xs text-slate-400">{t("projectionDisclaimer")}</p>
      </StatementSectionCard>
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
    <StatementSectionCard title={t("cardDebtSummary")} className="mb-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-800/80 bg-[#0A0F19] p-3">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-white">{money(value, card.currency)}</p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-800/80 bg-[#0A0F19] p-3">
          <p className="text-xs text-slate-400">{t("utilization")}</p>
          <p className="mt-1 font-mono text-sm font-bold text-white">
            {card.creditStatus.utilizationPercent == null ? "—" : `${formatNumber(card.creditStatus.utilizationPercent)}%`}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-1 text-xs text-slate-400">
        {summary.dueDate && <p>{t("currentPaymentDueDate", { date: formatDate(summary.dueDate, { dateStyle: "medium" }) })}</p>}
        <p>{t("postCloseExpenseCount", { count: formatNumber(summary.postCloseExpenseCount) })}</p>
        {summary.projectedNextCloseDate && <p>{t("projectedCloseDate", { date: formatDate(summary.projectedNextCloseDate, { dateStyle: "medium" }) })}</p>}
        <p>{t("projectionDisclaimer")}</p>
      </div>
    </StatementSectionCard>
  );
}
