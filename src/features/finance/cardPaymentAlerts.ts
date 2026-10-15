import type { CardPaymentAlert, CardPaymentDate, CreditCardOverviewItem } from "./credit-cards.types";
import { daysUntilDueDate, hasPaymentPending, parseDateOnly } from "./cardPaymentSchedule";

function calendarDate(value: string | null): string {
  if (!value) return "";
  const date = parseDateOnly(value);
  const prefix = value.slice(0, 10);
  if (!date || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` !== prefix) return "";
  return prefix;
}

export function cardPaymentDate(card: CreditCardOverviewItem): CardPaymentDate {
  const statementDate = calendarDate(card.statementSummary.dueDate);
  if (hasPaymentPending(card) && statementDate) return { kind: "statement", date: statementDate };
  const scheduledDate = calendarDate(card.schedule.nextPaymentDueDate);
  return scheduledDate ? { kind: "scheduled", date: scheduledDate } : { kind: "missing" };
}

export function buildCardPaymentAlerts(cards: CreditCardOverviewItem[], now = new Date()): CardPaymentAlert[] {
  const alerts: CardPaymentAlert[] = [];
  for (const card of cards) {
    if (!card.isActive || !hasPaymentPending(card)) continue;
    const dueDate = calendarDate(card.statementSummary.dueDate);
    const amount = card.statementSummary.currentPaymentDue ?? card.statementSummary.noInterestTarget;
    const daysUntilDue = dueDate ? daysUntilDueDate(dueDate, now) : null;
    if (amount == null || !Number.isFinite(amount) || amount <= 0 || daysUntilDue === null || daysUntilDue > 3) continue;
    alerts.push({ card, dueDate, amount, daysUntilDue });
  }
  return alerts.sort((left, right) => left.daysUntilDue - right.daysUntilDue);
}
