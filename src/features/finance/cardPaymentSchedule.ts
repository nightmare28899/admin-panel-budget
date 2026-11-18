import { getCutoffPaymentState, compareByUrgency, type CutoffPaymentState } from "./cardCutoffStatus";
import type { CreditCardOverviewItem } from "./credit-cards.types";

export { calendarDaysBetween, daysUntilDueDate, parseDateOnly } from "./calendarDates";

/**
 * A card needs attention when its latest statement still asks for money, or a
 * cutoff passed without an uploaded statement (so the amount is unknown).
 */
export function hasPaymentPending(card: CreditCardOverviewItem, now: Date = new Date()): boolean {
  return getCutoffPaymentState(card, now).pending;
}

export type PendingPayment = {
  card: CreditCardOverviewItem;
  /** Null for cards waiting for a statement. */
  dueDate: string | null;
  daysUntilDue: number | null;
  state: CutoffPaymentState;
};

/** Active cards needing attention: overdue first, then nearest due date, then cutoffs without a statement. */
export function listPendingPayments(
  cards: CreditCardOverviewItem[],
  now: Date = new Date(),
): PendingPayment[] {
  return cards
    .filter((card) => card.isActive)
    .map((card) => ({ card, state: getCutoffPaymentState(card, now) }))
    .filter(({ state }) => state.pending)
    .map(({ card, state }) => ({ card, state, dueDate: state.dueDate, daysUntilDue: state.daysUntilDue }))
    .sort((left, right) => compareByUrgency(left.state, right.state));
}
