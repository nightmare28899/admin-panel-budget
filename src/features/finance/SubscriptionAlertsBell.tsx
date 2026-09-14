"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Popover } from "antd";
import { getSubscriptionsAction } from "@/lib/userActions";
import { daysUntil, type Subscription } from "./subscriptions.types";
import { toCalendarDate } from "./finance.types";
import { useLocale } from "@/i18n/LocaleProvider";

export type SubscriptionAlert = {
  key: string;
  title: string;
  amount: number;
  currency: string;
  nextPaymentDate: string;
  daysUntil: number;
  status: "overdue" | "due-soon";
};

const ALERT_HORIZON_DAYS = 7;

/**
 * Builds "due soon"/"overdue" alerts straight from each active
 * subscription's real nextPaymentDate. No more heuristic average-interval
 * prediction now that the backend returns a real recurrence date — this is
 * an exact calendar-day computation, not an estimate.
 */
export function buildSubscriptionAlerts(
  subscriptions: Subscription[],
  today: Date = new Date(),
): SubscriptionAlert[] {
  const alerts: SubscriptionAlert[] = [];

  for (const subscription of subscriptions) {
    if (!subscription.isActive) continue;

    const remaining = daysUntil(subscription.nextPaymentDate, today);
    if (remaining > ALERT_HORIZON_DAYS) continue;

    alerts.push({
      key: subscription.id,
      title: subscription.name,
      amount: Number(subscription.cost),
      currency: subscription.currency,
      nextPaymentDate: toCalendarDate(subscription.nextPaymentDate),
      daysUntil: remaining,
      status: remaining < 0 ? "overdue" : "due-soon",
    });
  }

  return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function formatDue(alert: SubscriptionAlert, t: ReturnType<typeof useLocale>["t"], formatNumber: ReturnType<typeof useLocale>["formatNumber"]) {
  if (alert.status === "overdue") {
    const days = Math.abs(alert.daysUntil);
    return t("overdueBy", { count: formatNumber(days), days: t(days === 1 ? "day" : "days") });
  }
  if (alert.daysUntil === 0) return t("dueToday");
  return t("dueIn", { count: formatNumber(alert.daysUntil), days: t(alert.daysUntil === 1 ? "day" : "days") });
}

export function SubscriptionAlertsBell() {
  const { t, formatNumber } = useLocale();
  const [alerts, setAlerts] = useState<SubscriptionAlert[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void getSubscriptionsAction().then((result) => {
      if (active && result.data) setAlerts(buildSubscriptionAlerts(result.data));
    });
    return () => {
      active = false;
    };
  }, []);

  const bell = (
    <button
      type="button"
      aria-label={
         alerts.length ? t("subscriptionAlertsCount", { count: formatNumber(alerts.length) }) : t("subscriptionAlerts")
      }
       title={t("subscriptionAlerts")}
      className="relative flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--text-2)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {alerts.length > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--rose)] px-1 text-[10px] font-semibold leading-none text-white">
          {alerts.length}
        </span>
      )}
    </button>
  );

  if (alerts.length === 0) return bell;

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      styles={{ content: { padding: 0 } }}
      open={open}
      onOpenChange={setOpen}
      content={
        <div className="w-[300px] max-w-[85vw] overflow-hidden rounded-[var(--radius-md)]">
          <div className="border-b border-[var(--border-soft)] px-4 pt-3.5 pb-3">
             <p className="text-[13px] font-semibold text-[var(--text-1)]">{t("subscriptionAlerts")}</p>
            <p className="mt-0.5 text-xs text-[var(--text-3)]">
               {t("alertsEstimate")}
            </p>
          </div>
          <ul>
            {alerts.map((alert) => {
              const overdue = alert.status === "overdue";
              return (
                <li
                  key={alert.key}
                  className={`border-l-2 px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--bg-3)] ${
                    overdue ? "border-l-[var(--rose)]" : "border-l-[var(--gold)]"
                  } ${alert !== alerts[alerts.length - 1] ? "border-b border-b-[var(--border-soft)]" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className={`mt-[3px] shrink-0 ${overdue ? "text-[var(--rose)]" : "text-[var(--gold-text)]"}`}
                    >
                      {overdue ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .87-1.46L13.71 3.86a1 1 0 0 0-1.73 0Z"
                        />
                      ) : (
                        <>
                          <circle cx="12" cy="12" r="9" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                        </>
                      )}
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-[var(--text-1)]">
                        {alert.title}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                        <span
                          className={`text-xs font-medium ${
                            overdue ? "text-[var(--rose)]" : "text-[var(--gold-text)]"
                          }`}
                        >
                           {formatDue(alert, t, formatNumber)}
                        </span>
                        <span className="text-xs text-[var(--text-3)]">
                           · ~{alert.currency} {formatNumber(alert.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link
            href="/finance/subscriptions"
            onClick={() => setOpen(false)}
            className="block border-t border-[var(--border-soft)] px-4 py-2.5 text-xs font-medium text-[var(--emerald-text)] transition-colors hover:bg-[var(--bg-3)] hover:underline"
          >
             {t("viewAllSubscriptions")}
          </Link>
        </div>
      }
    >
      {bell}
    </Popover>
  );
}
