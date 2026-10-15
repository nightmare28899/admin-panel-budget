"use client";

import { useState } from "react";
import Link from "next/link";
import { Popover } from "antd";
import { useLocale } from "@/i18n/LocaleProvider";
import { useCardPaymentAlerts } from "./hooks/useCardPaymentAlerts";

export function CardPaymentAlertsBell() {
  const { t, formatNumber, formatDate } = useLocale();
  const { alerts, status } = useCardPaymentAlerts();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      styles={{ content: { padding: 0 } }}
      content={
        <div className="w-[320px] max-w-[85vw] overflow-hidden rounded-[var(--radius-md)]">
          <div className="border-b border-[var(--border-soft)] px-4 py-3">
            <p className="text-[13px] font-semibold text-[var(--text-1)]">{t("cardPaymentAlerts")}</p>
            <p className="mt-1 text-xs text-[var(--text-3)]">{t("cardPaymentAlertsPolicy")}</p>
          </div>
          {status !== "ready" || alerts.length === 0 ? (
            <p role="status" className="px-4 py-3 text-xs text-[var(--text-3)]">
              {t(status === "loading" ? "cardPaymentAlertsLoading" : status === "error" ? "cardPaymentAlertsUnavailable" : "cardPaymentAlertsEmpty")}
            </p>
          ) : (
            <ul aria-label={t("cardPaymentAlerts")} className="max-h-80 overflow-y-auto">
              {alerts.map(({ card, dueDate, amount, daysUntilDue }) => (
                <li key={card.id} className={`border-b border-l-2 border-b-[var(--border-soft)] px-4 py-3 ${daysUntilDue < 0 ? "border-l-[var(--rose)]" : "border-l-[var(--gold)]"}`}>
                  <p className="text-[13px] font-medium text-[var(--text-1)]">{card.bank} · {card.name} · {card.last4}</p>
                  <p className={`mt-1 text-xs ${daysUntilDue < 0 ? "text-[var(--rose-text)]" : "text-[var(--gold-text)]"}`}>
                    {daysUntilDue === 0 ? t("dueToday") : t(daysUntilDue < 0 ? "overdueBy" : "dueIn", {
                      count: formatNumber(Math.abs(daysUntilDue)),
                      days: t(Math.abs(daysUntilDue) === 1 ? "day" : "days"),
                    })}
                    {" · "}{formatDate(dueDate, { dateStyle: "medium" })}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[var(--text-2)]">
                    {card.currency} {formatNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/finance/cards" onClick={() => setOpen(false)} className="block border-t border-[var(--border-soft)] px-4 py-2.5 text-xs font-medium text-[var(--accent-text)] hover:underline">
            {t("viewPaymentCards")}
          </Link>
        </div>
      }
    >
      <button
        type="button"
        aria-label={alerts.length ? t("cardPaymentAlertsCount", { count: formatNumber(alerts.length) }) : t("cardPaymentAlerts")}
        aria-expanded={open}
        title={t("cardPaymentAlerts")}
        className="relative flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--text-2)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] focus-visible:outline-2 focus-visible:outline-sky-400"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <rect x="2" y="5" width="20" height="14" rx="3" />
          <path d="M2 10h20m-15 5h4" />
        </svg>
        {alerts.length > 0 && (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--rose)] px-1 text-[10px] font-semibold text-[var(--text-1)]">{formatNumber(alerts.length)}</span>
        )}
      </button>
    </Popover>
  );
}
