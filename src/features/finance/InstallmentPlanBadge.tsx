"use client";

import type { Expense, FinancingPlan } from "./finance.types";
import { Badge } from "@/components/ui/Badge";
import { useLocale } from "@/i18n/LocaleProvider";

function useMoney(currency: string) {
  const { formatNumber } = useLocale();
  return (value: number | string) =>
    `${currency} ${formatNumber(Number(value), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InstallmentPlanBadge({ expense }: { expense: Pick<Expense, "financingPlan" | "currency"> }) {
  const { t, formatNumber } = useLocale();
  const money = useMoney(expense.currency);
  const plan = expense.financingPlan;
  if (!plan) return null;

  const hasCounts = plan.installmentNumber != null && plan.installmentCount != null;
  const counts = { index: formatNumber(plan.installmentNumber ?? 0), count: formatNumber(plan.installmentCount ?? 0) };
  const label =
    plan.type === "INTEREST_BEARING"
      ? t(hasCounts ? "interestInstallmentsBadge" : "interestInstallmentsBadgeShort", counts)
      : t(hasCounts ? "msiBadge" : "msiBadgeShort", counts);
  const tooltip = [
    plan.originalAmount != null && `${t("originalAmount")}: ${money(plan.originalAmount)}`,
    plan.remainingAmount != null && `${t("remainingAmount")}: ${money(plan.remainingAmount)}`,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <span title={tooltip || undefined}>
        <Badge variant={plan.type === "INTEREST_BEARING" ? "warning" : "info"}>{label}</Badge>
      </span>
      {plan.installmentAmount != null && (
        <span className="text-[11px] text-[var(--text-3)]" title={tooltip || undefined}>
          {t("perMonth", { amount: money(plan.installmentAmount) })}
        </span>
      )}
    </>
  );
}

export function InstallmentPlanDetails({ expense }: { expense: Pick<Expense, "financingPlan" | "currency"> }) {
  const { t, formatNumber, formatDate } = useLocale();
  const money = useMoney(expense.currency);
  const plan: FinancingPlan | null | undefined = expense.financingPlan;
  if (!plan) return null;

  const rows: Array<[string, string]> = [
    [t("planType"), t(plan.type === "INTEREST_BEARING" ? "planTypeInterest" : "planTypeNoInterest")],
  ];
  if (plan.installmentNumber != null && plan.installmentCount != null) {
    rows.push([t("installmentProgress"), t("installmentOf", { index: formatNumber(plan.installmentNumber), count: formatNumber(plan.installmentCount) })]);
  }
  if (plan.installmentAmount != null) rows.push([t("monthlyAmount"), money(plan.installmentAmount)]);
  if (plan.originalAmount != null) rows.push([t("originalAmount"), money(plan.originalAmount)]);
  if (plan.remainingAmount != null) rows.push([t("remainingAmount"), money(plan.remainingAmount)]);
  if (plan.purchaseDate) {
    const day = plan.purchaseDate.slice(0, 10);
    rows.push([t("purchaseDate"), formatDate(`${day}T12:00:00`, { year: "numeric", month: "short", day: "numeric" })]);
  }

  return (
    <section aria-label={t("installmentPlanTitle")} className="mb-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/40 px-3 py-2">
      <h4 className="mb-1 text-xs font-semibold text-[var(--text-2)]">{t("installmentPlanTitle")}</h4>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-[var(--text-3)]">{label}</dt>
            <dd className="text-right font-mono text-[var(--text-1)]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
