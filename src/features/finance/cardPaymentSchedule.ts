import type { CreditCardOverviewItem } from "./credit-cards.types";

const DAY_MS = 86_400_000;

/** Parses "YYYY-MM-DD" (or an ISO string starting with it) as a local calendar day. */
export function parseDateOnly(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Whole local calendar days from `from` to `to` (negative when `to` is earlier). */
export function calendarDaysBetween(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / DAY_MS);
}

/** Calendar days until a date-only due date; negative when overdue, null when unparseable. */
export function daysUntilDueDate(dueDate: string, now: Date = new Date()): number | null {
  const due = parseDateOnly(dueDate);
  return due ? calendarDaysBetween(now, due) : null;
}

/**
 * A card has a payment pending when its latest statement is not fully paid and
 * still asks for money. Statements with nothing left to pay are not pending.
 */
export function hasPaymentPending(card: CreditCardOverviewItem): boolean {
  const summary = card.statementSummary;
  if (!summary.statementImportId || summary.paymentStatus === "PAID") return false;
  return !(summary.currentPaymentDue != null && summary.currentPaymentDue <= 0);
}

export type PendingPayment = {
  card: CreditCardOverviewItem;
  dueDate: string | null;
  daysUntilDue: number | null;
};

/** Active cards with a pending statement payment, nearest due date first (undated last). */
export function listPendingPayments(
  cards: CreditCardOverviewItem[],
  now: Date = new Date(),
): PendingPayment[] {
  return cards
    .filter((card) => card.isActive && hasPaymentPending(card))
    .map((card) => {
      const dueDate = card.statementSummary.dueDate;
      return { card, dueDate, daysUntilDue: dueDate ? daysUntilDueDate(dueDate, now) : null };
    })
    .sort((left, right) => {
      if (left.daysUntilDue === null && right.daysUntilDue === null) return 0;
      if (left.daysUntilDue === null) return 1;
      if (right.daysUntilDue === null) return -1;
      return left.daysUntilDue - right.daysUntilDue;
    });
}
