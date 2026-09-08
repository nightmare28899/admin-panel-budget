"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Popover } from "antd";
import {
  fetchSubscriptionGroups,
  predictSubscriptionAlerts,
  type SubscriptionAlert,
} from "./subscriptionUtils";

function formatDue(alert: SubscriptionAlert) {
  if (alert.status === "overdue") {
    const days = Math.abs(alert.daysUntil);
    return `Overdue by ${days} day${days === 1 ? "" : "s"}`;
  }
  if (alert.daysUntil === 0) return "Due today";
  return `Due in ${alert.daysUntil} day${alert.daysUntil === 1 ? "" : "s"}`;
}

export function SubscriptionAlertsBell() {
  const [alerts, setAlerts] = useState<SubscriptionAlert[]>([]);

  useEffect(() => {
    let active = true;
    void fetchSubscriptionGroups().then(({ groups }) => {
      if (active) setAlerts(predictSubscriptionAlerts(groups));
    });
    return () => {
      active = false;
    };
  }, []);

  const bell = (
    <button
      type="button"
      aria-label={
        alerts.length ? `Subscription alerts (${alerts.length})` : "Subscription alerts"
      }
      title="Subscription alerts"
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
      content={
        <div className="w-[300px] max-w-[85vw] overflow-hidden rounded-[var(--radius-md)]">
          <div className="border-b border-[var(--border-soft)] px-4 pt-3.5 pb-3">
            <p className="text-[13px] font-semibold text-[var(--text-1)]">Subscription alerts</p>
            <p className="mt-0.5 text-xs text-[var(--text-3)]">
              Estimated from your payment history — not a guarantee.
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
                          {formatDue(alert)}
                        </span>
                        <span className="text-xs text-[var(--text-3)]">
                          · ~{alert.currency} {alert.amount.toFixed(2)}
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
            className="block border-t border-[var(--border-soft)] px-4 py-2.5 text-xs font-medium text-[var(--emerald-text)] transition-colors hover:bg-[var(--bg-3)] hover:underline"
          >
            View all subscriptions →
          </Link>
        </div>
      }
    >
      {bell}
    </Popover>
  );
}
