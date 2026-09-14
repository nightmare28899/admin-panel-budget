"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSubscriptionsAction } from "@/lib/userActions";
import { buildSubscriptionAlerts, type SubscriptionAlert } from "./SubscriptionAlertsBell";
import { useLocale } from "@/i18n/LocaleProvider";

const BANNER_THRESHOLD_DAYS = 3;

export function SubscriptionDueBanner() {
  const { t, formatNumber } = useLocale();
  const [alerts, setAlerts] = useState<SubscriptionAlert[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    void getSubscriptionsAction().then((result) => {
      if (!active || !result.data) return;
      const urgent = buildSubscriptionAlerts(result.data).filter(
        (alert) => alert.status === "overdue" || alert.daysUntil <= BANNER_THRESHOLD_DAYS,
      );
      setAlerts(urgent);
    });
    return () => {
      active = false;
    };
  }, []);

  if (dismissed || alerts.length === 0) return null;

  const [first, ...rest] = alerts;
  const isOverdue = first.status === "overdue";
  const dueText = isOverdue
    ? t("wasDueAgo", { count: formatNumber(Math.abs(first.daysUntil)), days: t(Math.abs(first.daysUntil) === 1 ? "day" : "days") })
    : first.daysUntil === 0
       ? t("isDueToday")
       : t("isDueIn", { count: formatNumber(first.daysUntil), days: t(first.daysUntil === 1 ? "day" : "days") });

  const accentText = isOverdue ? "text-[var(--rose)]" : "text-[var(--gold-text)]";
  const containerClasses = isOverdue
    ? "border-[var(--rose)]/40 bg-[var(--rose)]/10"
    : "border-[var(--gold)]/40 bg-[var(--gold-dim)]";
  const dismissClasses = isOverdue
    ? "text-[var(--rose)]/70 hover:text-[var(--rose)]"
    : "text-[var(--gold-text)]/70 hover:text-[var(--gold-text)]";

  return (
    <div
      role="status"
      className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${containerClasses}`}
    >
      <span className="leading-relaxed">
        <strong className="font-semibold text-[var(--text-1)]">{first.title}</strong>{" "}
        <span className={`font-medium ${accentText}`}>{dueText}</span>{" "}
        <span className="text-xs text-[var(--text-3)]">
           {t("basedOnHistory", { currency: first.currency, amount: formatNumber(first.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}
        </span>
        .
        {rest.length > 0 && (
          <>
            {" "}
            <Link href="/finance/subscriptions" className={`underline ${accentText}`}>
               {t("moreCount", { count: formatNumber(rest.length) })}
            </Link>
          </>
        )}
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
         aria-label={t("dismiss")}
        className={`shrink-0 cursor-pointer transition-colors ${dismissClasses}`}
      >
        ✕
      </button>
    </div>
  );
}
