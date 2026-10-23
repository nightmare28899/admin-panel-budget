import { calendarDaysBetween, daysUntilDueDate, formatDateOnly, parseDateOnly } from "./calendarDates";
import type { CreditCardOverviewItem } from "./credit-cards.types";

export type CutoffPaymentStatus =
  | "PAID_UP"
  | "PARTIAL"
  | "UNPAID_DUE_FUTURE"
  | "OVERDUE"
  | "CUTOFF_NEEDS_STATEMENT"
  | "NO_CUTOFF_CONFIGURED";

export type CutoffPaymentState = {
  status: CutoffPaymentStatus;
  /** True when the card needs the user's attention (a payment or a statement upload). */
  pending: boolean;
  currency: string;
  /** Most recent cutoff (YYYY-MM-DD) derived from the card's own closing day. */
  lastCutoffDate: string | null;
  nextCutoffDate: string | null;
  daysSinceCutoff: number | null;
  dueDate: string | null;
  /** Negative when overdue. */
  daysUntilDue: number | null;
  /** Amounts are always null for CUTOFF_NEEDS_STATEMENT: the real figure is unknown until the statement is uploaded. */
  currentPaymentDue: number | null;
  remainingStatement: number | null;
  minimumPayment: number | null;
  noInterestTarget: number | null;
  /** Spend of the current cycle, only for CUTOFF_NEEDS_STATEMENT, as a labelled reference (not a payment amount). */
  cycleSpendReference: number | null;
};

function clampedDate(year: number, month: number, closingDay: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(closingDay, lastDay));
}

function validClosingDay(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 31;
}

function lastCutoff(closingDay: number, today: Date): Date {
  const thisMonth = clampedDate(today.getFullYear(), today.getMonth(), closingDay);
  return calendarDaysBetween(thisMonth, today) >= 0
    ? thisMonth
    : clampedDate(today.getFullYear(), today.getMonth() - 1, closingDay);
}

/** Most recent cutoff on or before `today`, clamped to the month length (day 31 -> Feb 28/29). */
export function lastCutoffDate(closingDay: number, today: Date = new Date()): string {
  return formatDateOnly(lastCutoff(closingDay, today));
}

/** First cutoff strictly after `today`, clamped to the month length. */
export function nextCutoffDate(closingDay: number, today: Date = new Date()): string {
  const last = lastCutoff(closingDay, today);
  return formatDateOnly(clampedDate(last.getFullYear(), last.getMonth() + 1, closingDay));
}

function owesMoney(card: CreditCardOverviewItem): boolean {
  const summary = card.statementSummary;
  if (!summary.statementImportId || summary.paymentStatus === "PAID") return false;
  return !(summary.currentPaymentDue != null && summary.currentPaymentDue <= 0);
}

function cycleSpend(card: CreditCardOverviewItem): number {
  return card.currentCycle?.spend ?? 0;
}

/** A cutoff passed with no statement uploaded for it, and the card carries spend/debt since it existed. */
function cutoffWithoutStatement(card: CreditCardOverviewItem, lastCutoff: string | null): boolean {
  if (!lastCutoff || card.statementSummary.statementImportId) return false;
  const created = card.createdAt ? parseDateOnly(card.createdAt) : null;
  const cutoff = parseDateOnly(lastCutoff);
  if (created && cutoff && calendarDaysBetween(created, cutoff) < 0) return false;
  return cycleSpend(card) > 0 || (card.creditStatus?.owedBalance ?? 0) > 0;
}

/** Classifies one card against its own cutoff (closing day) and latest statement. */
export function getCutoffPaymentState(
  card: CreditCardOverviewItem,
  today: Date = new Date(),
): CutoffPaymentState {
  const summary = card.statementSummary;
  const closingDay = validClosingDay(card.closingDay) ? card.closingDay : null;
  const last = closingDay ? lastCutoffDate(closingDay, today) : null;
  const next = card.schedule?.nextClosingDate
    ? (parseDateOnly(card.schedule.nextClosingDate) ? card.schedule.nextClosingDate.slice(0, 10) : null)
    : closingDay ? nextCutoffDate(closingDay, today) : null;
  const lastDate = last ? parseDateOnly(last) : null;
  const dueDate = summary.dueDate && parseDateOnly(summary.dueDate) ? summary.dueDate.slice(0, 10) : null;
  const daysUntilDue = dueDate ? daysUntilDueDate(dueDate, today) : null;

  const base = {
    currency: card.currency,
    lastCutoffDate: last,
    nextCutoffDate: next,
    daysSinceCutoff: lastDate ? calendarDaysBetween(lastDate, today) : null,
  };
  const noAmounts = {
    dueDate: null,
    daysUntilDue: null,
    currentPaymentDue: null,
    remainingStatement: null,
    minimumPayment: null,
    noInterestTarget: null,
  };

  if (summary.needsNewStatement === true || cutoffWithoutStatement(card, last)) {
    return {
      ...base,
      ...noAmounts,
      status: "CUTOFF_NEEDS_STATEMENT",
      pending: true,
      cycleSpendReference: cycleSpend(card),
    };
  }

  if (owesMoney(card)) {
    const status: CutoffPaymentStatus =
      daysUntilDue !== null && daysUntilDue < 0 ? "OVERDUE"
        : summary.paymentStatus === "PARTIAL" ? "PARTIAL"
          : "UNPAID_DUE_FUTURE";
    return {
      ...base,
      status,
      pending: true,
      dueDate,
      daysUntilDue,
      currentPaymentDue: summary.currentPaymentDue,
      remainingStatement: summary.remainingStatement,
      minimumPayment: summary.minimumPayment,
      noInterestTarget: summary.noInterestTarget,
      cycleSpendReference: null,
    };
  }

  return {
    ...base,
    ...noAmounts,
    status: closingDay === null && !summary.statementImportId ? "NO_CUTOFF_CONFIGURED" : "PAID_UP",
    pending: false,
    cycleSpendReference: null,
  };
}

function urgencyRank(state: CutoffPaymentState): number {
  if (state.status === "OVERDUE") return 0;
  if (state.status === "CUTOFF_NEEDS_STATEMENT") return 3;
  return state.daysUntilDue === null ? 2 : 1;
}

/** Overdue first, then nearest due date (undated after dated), then cutoffs waiting for a statement. */
export function compareByUrgency(left: CutoffPaymentState, right: CutoffPaymentState): number {
  const rank = urgencyRank(left) - urgencyRank(right);
  if (rank !== 0) return rank;
  if (left.status === "CUTOFF_NEEDS_STATEMENT") {
    return (right.daysSinceCutoff ?? 0) - (left.daysSinceCutoff ?? 0);
  }
  return (left.daysUntilDue ?? 0) - (right.daysUntilDue ?? 0);
}

export type CardCutoffEntry = { card: CreditCardOverviewItem; state: CutoffPaymentState };

export type CutoffCurrencyTotals = {
  currency: string;
  currentPaymentDue: number;
  minimumPayment: number;
  noInterestTarget: number;
  /** Cards with a payment amount to settle. */
  paymentCount: number;
  /** Cards waiting for a statement upload (no amount). */
  needsStatementCount: number;
  nearestDueDate: string | null;
};

/** Per-currency totals of pending cards. Cards waiting for a statement add no amount. */
export function groupPendingByCurrency(entries: CardCutoffEntry[]): CutoffCurrencyTotals[] {
  const groups = new Map<string, CutoffCurrencyTotals>();
  for (const { state } of entries) {
    if (!state.pending) continue;
    const group = groups.get(state.currency) ?? {
      currency: state.currency,
      currentPaymentDue: 0,
      minimumPayment: 0,
      noInterestTarget: 0,
      paymentCount: 0,
      needsStatementCount: 0,
      nearestDueDate: null,
    };
    if (state.status === "CUTOFF_NEEDS_STATEMENT") {
      group.needsStatementCount += 1;
    } else {
      group.paymentCount += 1;
      group.currentPaymentDue += state.currentPaymentDue ?? 0;
      group.minimumPayment += state.minimumPayment ?? 0;
      group.noInterestTarget += state.noInterestTarget ?? state.currentPaymentDue ?? 0;
      if (state.dueDate && (!group.nearestDueDate || state.dueDate < group.nearestDueDate)) {
        group.nearestDueDate = state.dueDate;
      }
    }
    groups.set(state.currency, group);
  }
  return [...groups.values()];
}
