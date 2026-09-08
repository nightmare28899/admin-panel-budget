"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSubscriptionGroups, predictSubscriptionAlerts } from "./subscriptionUtils";
import type { SubscriptionAlert } from "./subscriptionUtils";

const BANNER_THRESHOLD_DAYS = 3;

export function SubscriptionDueBanner() {
  const [alerts, setAlerts] = useState<SubscriptionAlert[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchSubscriptionGroups().then(({ groups }) => {
      if (!active) return;
      const urgent = predictSubscriptionAlerts(groups).filter(
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
    ? `was due ${Math.abs(first.daysUntil)} day${Math.abs(first.daysUntil) === 1 ? "" : "s"} ago`
    : first.daysUntil === 0
      ? "is due today"
      : `is due in ${first.daysUntil} day${first.daysUntil === 1 ? "" : "s"}`;

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
          (~{first.currency} {first.amount.toFixed(2)}, based on your payment history)
        </span>
        .
        {rest.length > 0 && (
          <>
            {" "}
            <Link href="/finance/subscriptions" className={`underline ${accentText}`}>
              +{rest.length} more →
            </Link>
          </>
        )}
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className={`shrink-0 cursor-pointer transition-colors ${dismissClasses}`}
      >
        ✕
      </button>
    </div>
  );
}
