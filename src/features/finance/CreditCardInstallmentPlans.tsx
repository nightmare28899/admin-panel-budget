"use client";

import { useId, useState } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { useLocale } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import type { CreditCardInstallmentPlan } from "./credit-cards.types";

const TYPE_BADGE: Record<CreditCardInstallmentPlan["type"], { variant: BadgeVariant; label: MessageKey }> = {
  NO_INTEREST: { variant: "info", label: "planBadgeMsi" },
  INTEREST_BEARING: { variant: "warning", label: "planBadgeInterest" },
  REFINANCED: { variant: "neutral", label: "planBadgeRefinanced" },
};

export function CreditCardInstallmentPlans({ plans, currency }: { plans: CreditCardInstallmentPlan[]; currency: string }) {
  const { t, formatNumber, formatDate } = useLocale();
  const [open, setOpen] = useState(false);
  const regionId = useId();
  if (plans.length === 0) return null;

  const money = (value: number) => `${currency} ${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const sorted = [...plans].sort((a, b) => (b.remainingAmount ?? -1) - (a.remainingAmount ?? -1));
  const monthly = plans.reduce((sum, p) => sum + (p.installmentAmount ?? 0), 0);
  const remaining = plans.reduce((sum, p) => sum + (p.remainingAmount ?? 0), 0);
  const statementEnd = plans.find((p) => p.statementPeriodEnd)?.statementPeriodEnd;
  const summary = t(plans.length === 1 ? "planPurchasesOne" : "planPurchasesMany", {
    count: formatNumber(plans.length),
    amount: money(monthly),
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 text-xs">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left font-medium text-slate-200 transition hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
      >
        <span>{summary}</span>
        <span aria-hidden="true" className="text-slate-500">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div id={regionId} role="region" aria-label={t("planPurchasesTitle")} className="border-t border-slate-800/80 px-3 pb-3 pt-1">
          <ul className="divide-y divide-slate-800/60">
            {sorted.map((plan) => {
              const badge = TYPE_BADGE[plan.type];
              const hasProgress = plan.installmentNumber != null && plan.installmentCount != null && plan.installmentCount > 0;
              const pct = hasProgress ? Math.min(100, Math.max(0, ((plan.installmentNumber as number) / (plan.installmentCount as number)) * 100)) : 0;
              const details = [
                plan.originalAmount != null && `${t("originalAmount")}: ${money(plan.originalAmount)}`,
                plan.purchaseDate && formatDate(`${plan.purchaseDate.slice(0, 10)}T12:00:00`, { dateStyle: "medium" }),
              ].filter(Boolean).join(" · ");
              return (
                <li key={plan.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-slate-200">{plan.merchantName || t("planGenericPurchase")}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {plan.isFinalInstallment && <Badge variant="success">{t("planLastInstallment")}</Badge>}
                      <Badge variant={badge.variant}>{t(badge.label)}</Badge>
                    </span>
                  </div>
                  {hasProgress && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div
                        role="progressbar"
                        aria-label={t("installmentProgress")}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(pct)}
                        className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800"
                      >
                        <div className="h-1 rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">
                        {t("installmentOf", { index: formatNumber(plan.installmentNumber as number), count: formatNumber(plan.installmentCount as number) })}
                      </span>
                    </div>
                  )}
                  <div className="mt-1 flex items-baseline justify-between gap-2 font-mono text-[11px] text-slate-400">
                    <span>{plan.installmentAmount != null ? t("perMonth", { amount: money(plan.installmentAmount) }) : "—"}</span>
                    {plan.remainingAmount != null && <span>{t("remainingAmount")}: {money(plan.remainingAmount)}</span>}
                  </div>
                  {details && <p className="mt-0.5 text-[11px] text-slate-500">{details}</p>}
                </li>
              );
            })}
          </ul>
          <div className="mt-1 space-y-0.5 border-t border-slate-800/80 pt-2 font-mono text-slate-300">
            <div className="flex justify-between"><span className="font-sans text-slate-400">{t("planTotalMonthly")}</span><span>{money(monthly)}</span></div>
            <div className="flex justify-between"><span className="font-sans text-slate-400">{t("planTotalRemaining")}</span><span>{money(remaining)}</span></div>
          </div>
          {statementEnd && (
            <p className="mt-2 text-[11px] text-slate-500">
              {t("planStatementAsOf", { date: formatDate(statementEnd, { dateStyle: "medium" }) })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
