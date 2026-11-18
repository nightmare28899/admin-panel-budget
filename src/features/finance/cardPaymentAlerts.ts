import type { CardPaymentAlert, CardPaymentDate, CreditCardOverviewItem, CutoffStatementAlert } from "./credit-cards.types";
import { daysUntilDueDate, parseDateOnly } from "./cardPaymentSchedule";
import { getCutoffPaymentState } from "./cardCutoffStatus";

function calendarDate(value: string | null): string {
  if (!value) return "";
  const date = parseDateOnly(value);
  const prefix = value.slice(0, 10);
  if (!date || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` !== prefix) return "";
  return prefix;
}

/** True when the latest statement still asks for money (excludes cards that only need a new statement). */
function hasStatementPayment(card: CreditCardOverviewItem, now: Date): boolean {
  const state = getCutoffPaymentState(card, now);
  return state.pending && state.status !== "CUTOFF_NEEDS_STATEMENT";
}

export function cardPaymentDate(card: CreditCardOverviewItem, now = new Date()): CardPaymentDate {
  const statementDate = calendarDate(card.statementSummary.dueDate);
  if (hasStatementPayment(card, now) && statementDate) return { kind: "statement", date: statementDate };
  const scheduledDate = calendarDate(card.schedule.nextPaymentDueDate);
  return scheduledDate ? { kind: "scheduled", date: scheduledDate } : { kind: "missing" };
}

export function buildCardPaymentAlerts(cards: CreditCardOverviewItem[], now = new Date()): CardPaymentAlert[] {
  const alerts: CardPaymentAlert[] = [];
  for (const card of cards) {
    if (!card.isActive || !hasStatementPayment(card, now)) continue;
    const dueDate = calendarDate(card.statementSummary.dueDate);
    const amount = card.statementSummary.currentPaymentDue ?? card.statementSummary.noInterestTarget;
    const daysUntilDue = dueDate ? daysUntilDueDate(dueDate, now) : null;
    if (amount == null || !Number.isFinite(amount) || amount <= 0 || daysUntilDue === null || daysUntilDue > 3) continue;
    alerts.push({ card, dueDate, amount, daysUntilDue });
  }
  return alerts.sort((left, right) => left.daysUntilDue - right.daysUntilDue);
}

/** Active cards whose cutoff passed without an uploaded statement, oldest cutoff first. No amount is known. */
export function buildCutoffStatementAlerts(cards: CreditCardOverviewItem[], now = new Date()): CutoffStatementAlert[] {
  const alerts: CutoffStatementAlert[] = [];
  for (const card of cards) {
    if (!card.isActive) continue;
    const state = getCutoffPaymentState(card, now);
    if (state.status !== "CUTOFF_NEEDS_STATEMENT") continue;
    alerts.push({ card, cutoffDate: state.lastCutoffDate, daysSinceCutoff: state.daysSinceCutoff });
  }
  return alerts.sort((left, right) => (right.daysSinceCutoff ?? 0) - (left.daysSinceCutoff ?? 0));
}
