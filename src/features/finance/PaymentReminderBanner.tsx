"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import { listPendingPayments, type PendingPayment } from "./cardPaymentSchedule";
import type { CreditCardOverviewItem } from "./credit-cards.types";
import {
  buildPaymentRemindersIcs,
  downloadIcs,
  paymentReminderFilename,
  type PaymentReminderEvent,
} from "./paymentReminderIcs";

export function PaymentReminderBanner({ cards }: { cards: CreditCardOverviewItem[] }) {
  const { t, formatNumber, formatDate } = useLocale();
  const pending = useMemo(() => listPendingPayments(cards), [cards]);
  const dated = pending.filter((item): item is PendingPayment & { dueDate: string } => item.dueDate !== null);
  const urgent = dated[0];

  if (cards.every((card) => !card.isActive)) return null;

  const money = (value: number, currency: string) =>
    `${currency} ${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // Avoid "BBVA BBVA" / "Rappi Card Rappi" when the card name repeats the bank.
  const cardLabel = (card: CreditCardOverviewItem) => {
    const bank = card.bank.trim();
    const name = card.name.trim();
    if (!name) return bank;
    if (!bank) return name;
    const [lowerBank, lowerName] = [bank.toLowerCase(), name.toLowerCase()];
    if (lowerBank.includes(lowerName)) return bank;
    if (lowerName.includes(lowerBank)) return name;
    return `${bank} ${name}`;
  };

  const toEvent = ({ card, dueDate }: PendingPayment & { dueDate: string }): PaymentReminderEvent => {
    const summary = card.statementSummary;
    const label = cardLabel(card);
    const noInterest = summary.currentPaymentDue ?? summary.noInterestTarget;
    const description = [
      noInterest != null ? t("reminderEventNoInterest", { amount: money(noInterest, card.currency) }) : null,
      summary.minimumPayment != null ? t("reminderEventMinimum", { amount: money(summary.minimumPayment, card.currency) }) : null,
    ].filter(Boolean).join("\n");
    return {
      uid: `${summary.statementImportId ?? card.id}-${dueDate}`,
      dueDate,
      summary: noInterest != null
        ? t("reminderEventTitle", { card: label, amount: money(noInterest, card.currency) })
        : t("reminderEventTitleNoAmount", { card: label }),
      description,
      alarmDescription: t("reminderEventAlarm", { card: label }),
    };
  };

  const schedule = (items: Array<PendingPayment & { dueDate: string }>) => {
    const first = items[0];
    const filename = items.length === 1
      ? paymentReminderFilename(first.card.bank, first.dueDate)
      : paymentReminderFilename(t("allCardsFileLabel"), first.dueDate);
    downloadIcs(filename, buildPaymentRemindersIcs(items.map(toEvent)));
  };

  let title = t("smartReminderTitle");
  let message: string;
  if (urgent) {
    const { card, dueDate, daysUntilDue } = urgent;
    const days = daysUntilDue ?? 0;
    const key: MessageKey =
      days === 0 ? "reminderDueToday"
        : days === 1 ? "reminderDueInOne"
          : days > 1 ? "reminderDueIn"
            : days === -1 ? "reminderOverdueOne"
              : "reminderOverdue";
    const amount = card.statementSummary.currentPaymentDue ?? card.statementSummary.noInterestTarget;
    message = [
      t(key, {
        card: cardLabel(card),
        count: formatNumber(Math.abs(days)),
        date: formatDate(dueDate, { dateStyle: "medium" }),
      }),
      amount != null ? t("reminderAmount", { amount: money(amount, card.currency) }) : null,
    ].filter(Boolean).join(" ");
  } else if (pending.length > 0) {
    message = t("reminderNoDueDate", { card: cardLabel(pending[0].card) });
  } else {
    title = t("reminderAllClear");
    message = t("reminderAllClearDescription");
  }

  return (
    <aside
      aria-label={t("smartReminderTitle")}
      className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--emerald)]/30 bg-[var(--emerald-dim)] px-5 py-4"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--emerald)]/30 bg-[var(--bg-2)]/60 text-lg text-[var(--emerald-text)]">
          {urgent ? "🔔" : "✓"}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-1)]">{title}</p>
          <p className="mt-0.5 text-xs text-[var(--text-2)]">{message}</p>
        </div>
      </div>
      {urgent && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="tinted" onClick={() => schedule([urgent])}>
            {t("scheduleReminder")}
          </Button>
          {dated.length > 1 && (
            <Button type="button" variant="outline" onClick={() => schedule(dated)}>
              {t("scheduleAllReminders", { count: formatNumber(dated.length) })}
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}
