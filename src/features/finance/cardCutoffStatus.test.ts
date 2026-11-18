import { describe, expect, it } from "vitest";
import {
  compareByUrgency,
  getCutoffPaymentState,
  groupPendingByCurrency,
  lastCutoffDate,
  nextCutoffDate,
} from "./cardCutoffStatus";
import type { CreditCardOverviewItem } from "./credit-cards.types";

type CardOverrides = {
  card?: Partial<CreditCardOverviewItem>;
  statement?: Partial<CreditCardOverviewItem["statementSummary"]>;
};

function makeCard({ card = {}, statement = {} }: CardOverrides = {}): CreditCardOverviewItem {
  return {
    id: "card",
    isActive: true,
    currency: "MXN",
    closingDay: 15,
    paymentDueDay: 5,
    createdAt: "2026-01-01T00:00:00Z",
    currentCycle: { currency: "MXN", start: "2026-10-16", end: "2026-11-15", spend: 0, expenseCount: 0, currencyMismatchCount: 0 },
    creditStatus: { currency: "MXN", limit: 10000, availableCredit: 5000, utilizationPercent: 50, owedBalance: 0 },
    schedule: { nextClosingDate: "2026-11-15", daysUntilClosing: 24, nextPaymentDueDate: "2026-11-05", daysUntilPaymentDue: 14 },
    statementSummary: {
      statementImportId: "statement",
      paymentStatus: "UNPAID",
      remainingStatement: 1000,
      currentPaymentDue: 800,
      minimumPayment: 150,
      noInterestTarget: 900,
      dueDate: "2026-11-05",
      ...statement,
    },
    ...card,
  } as CreditCardOverviewItem;
}

const today = new Date(2026, 9, 22, 10); // 2026-10-22

describe("cutoff dates", () => {
  it("uses this month's closing day once it has passed", () => {
    expect(lastCutoffDate(15, new Date(2026, 9, 22))).toBe("2026-10-15");
    expect(lastCutoffDate(22, new Date(2026, 9, 22))).toBe("2026-10-22");
  });
  it("falls back to the previous month before the closing day", () => {
    expect(lastCutoffDate(25, new Date(2026, 9, 22))).toBe("2026-09-25");
  });
  it("rolls over the year", () => {
    expect(lastCutoffDate(20, new Date(2027, 0, 5))).toBe("2026-12-20");
  });
  it("clamps to the month length", () => {
    expect(lastCutoffDate(31, new Date(2027, 2, 1))).toBe("2027-02-28");
    expect(lastCutoffDate(31, new Date(2027, 1, 28))).toBe("2027-02-28");
    expect(lastCutoffDate(30, new Date(2028, 1, 29))).toBe("2028-02-29");
    expect(lastCutoffDate(31, new Date(2026, 4, 10))).toBe("2026-04-30");
  });
  it("derives the next cutoff after the last one, clamped", () => {
    expect(nextCutoffDate(15, new Date(2026, 9, 22))).toBe("2026-11-15");
    expect(nextCutoffDate(31, new Date(2027, 0, 31))).toBe("2027-02-28");
    expect(nextCutoffDate(20, new Date(2026, 11, 25))).toBe("2027-01-20");
  });
});

describe("getCutoffPaymentState", () => {
  it("reports an unpaid statement due in the future", () => {
    const state = getCutoffPaymentState(makeCard(), today);
    expect(state).toMatchObject({
      status: "UNPAID_DUE_FUTURE",
      pending: true,
      lastCutoffDate: "2026-10-15",
      nextCutoffDate: "2026-11-15",
      daysSinceCutoff: 7,
      daysUntilDue: 14,
      dueDate: "2026-11-05",
      currentPaymentDue: 800,
      remainingStatement: 1000,
      minimumPayment: 150,
      noInterestTarget: 900,
      currency: "MXN",
      cycleSpendReference: null,
    });
  });

  it("reports a partially paid statement", () => {
    const state = getCutoffPaymentState(makeCard({ statement: { paymentStatus: "PARTIAL" } }), today);
    expect(state.status).toBe("PARTIAL");
    expect(state.pending).toBe(true);
  });

  it("reports overdue when past the due date with money remaining, even if partial", () => {
    const state = getCutoffPaymentState(
      makeCard({ statement: { dueDate: "2026-10-20", paymentStatus: "PARTIAL" } }),
      today,
    );
    expect(state.status).toBe("OVERDUE");
    expect(state.daysUntilDue).toBe(-2);
  });

  it("is due-today (not overdue) on the due date", () => {
    const state = getCutoffPaymentState(makeCard({ statement: { dueDate: "2026-10-22" } }), today);
    expect(state.status).toBe("UNPAID_DUE_FUTURE");
    expect(state.daysUntilDue).toBe(0);
  });

  it("reports paid up when the statement is paid and covers the cycle", () => {
    const state = getCutoffPaymentState(
      makeCard({ statement: { paymentStatus: "PAID", needsNewStatement: false, coversCurrentCycle: true } }),
      today,
    );
    expect(state.status).toBe("PAID_UP");
    expect(state.pending).toBe(false);
  });

  it("treats an unpaid statement with nothing left to pay as paid up", () => {
    const state = getCutoffPaymentState(makeCard({ statement: { currentPaymentDue: 0 } }), today);
    expect(state.status).toBe("PAID_UP");
  });

  it("flags a closed cycle without an uploaded statement and hides amounts", () => {
    const state = getCutoffPaymentState(
      makeCard({
        statement: { paymentStatus: "PAID", needsNewStatement: true, coversCurrentCycle: false },
        card: { currentCycle: { currency: "MXN", start: "2026-10-16", end: "2026-11-15", spend: 4321, expenseCount: 3, currencyMismatchCount: 0 } },
      }),
      today,
    );
    expect(state.status).toBe("CUTOFF_NEEDS_STATEMENT");
    expect(state.pending).toBe(true);
    expect(state.currentPaymentDue).toBeNull();
    expect(state.remainingStatement).toBeNull();
    expect(state.minimumPayment).toBeNull();
    expect(state.noInterestTarget).toBeNull();
    expect(state.dueDate).toBeNull();
    expect(state.daysUntilDue).toBeNull();
    expect(state.cycleSpendReference).toBe(4321);
    expect(state.daysSinceCutoff).toBe(7);
  });

  it("flags a card with no statement, spend, and a passed cutoff", () => {
    const state = getCutoffPaymentState(
      makeCard({
        statement: { statementImportId: null, paymentStatus: "UNPAID", currentPaymentDue: null, dueDate: null },
        card: { creditStatus: { currency: "MXN", limit: null, availableCredit: null, utilizationPercent: null, owedBalance: 700 } },
      }),
      today,
    );
    expect(state.status).toBe("CUTOFF_NEEDS_STATEMENT");
  });

  it("does not flag a card created after its last cutoff", () => {
    const state = getCutoffPaymentState(
      makeCard({
        statement: { statementImportId: null, currentPaymentDue: null, dueDate: null },
        card: {
          createdAt: "2026-10-18T00:00:00Z",
          creditStatus: { currency: "MXN", limit: null, availableCredit: null, utilizationPercent: null, owedBalance: 700 },
        },
      }),
      today,
    );
    expect(state.status).toBe("PAID_UP");
  });

  it("does not flag a card with no statement and no spend", () => {
    const state = getCutoffPaymentState(
      makeCard({ statement: { statementImportId: null, currentPaymentDue: null, dueDate: null } }),
      today,
    );
    expect(state.status).toBe("PAID_UP");
    expect(state.pending).toBe(false);
  });

  it("reports no cutoff configured without a closing day and nothing to pay", () => {
    const state = getCutoffPaymentState(
      makeCard({
        card: { closingDay: null },
        statement: { statementImportId: null, currentPaymentDue: null, dueDate: null },
      }),
      today,
    );
    expect(state.status).toBe("NO_CUTOFF_CONFIGURED");
    expect(state.lastCutoffDate).toBeNull();
    expect(state.daysSinceCutoff).toBeNull();
    expect(state.pending).toBe(false);
  });

  it("still reports an unpaid statement when no closing day is configured", () => {
    const state = getCutoffPaymentState(makeCard({ card: { closingDay: null } }), today);
    expect(state.status).toBe("UNPAID_DUE_FUTURE");
    expect(state.lastCutoffDate).toBeNull();
    expect(state.nextCutoffDate).toBe("2026-11-15");
  });

  it("clamps the cutoff for a day-31 card in a short month", () => {
    const state = getCutoffPaymentState(
      makeCard({ card: { closingDay: 31, schedule: { nextClosingDate: null, daysUntilClosing: null, nextPaymentDueDate: null, daysUntilPaymentDue: null } } }),
      new Date(2027, 2, 1),
    );
    expect(state.lastCutoffDate).toBe("2027-02-28");
    expect(state.daysSinceCutoff).toBe(1);
    expect(state.nextCutoffDate).toBe("2027-03-31");
  });

  it("carries the card currency", () => {
    const state = getCutoffPaymentState(makeCard({ card: { currency: "USD" } }), today);
    expect(state.currency).toBe("USD");
  });
});

describe("urgency ordering and grouping", () => {
  const overdue = makeCard({ card: { id: "overdue" }, statement: { dueDate: "2026-10-10" } });
  const soon = makeCard({ card: { id: "soon" }, statement: { dueDate: "2026-10-25" } });
  const later = makeCard({ card: { id: "later" }, statement: { dueDate: "2026-11-05" } });
  const needs = makeCard({ card: { id: "needs" }, statement: { paymentStatus: "PAID", needsNewStatement: true } });
  const paid = makeCard({ card: { id: "paid" }, statement: { paymentStatus: "PAID", needsNewStatement: false } });

  it("sorts overdue, then by due date, then cutoff-needs-statement", () => {
    const states = [needs, later, paid, overdue, soon].map((c) => ({ id: c.id, state: getCutoffPaymentState(c, today) }));
    const sorted = states.filter((s) => s.state.pending).sort((a, b) => compareByUrgency(a.state, b.state));
    expect(sorted.map((s) => s.id)).toEqual(["overdue", "soon", "later", "needs"]);
  });

  it("groups pending totals per currency and excludes needs-statement amounts", () => {
    const usd = makeCard({ card: { id: "usd", currency: "USD" }, statement: { currentPaymentDue: 50, minimumPayment: 10, noInterestTarget: 60 } });
    const groups = groupPendingByCurrency(
      [overdue, soon, needs, usd].map((c) => ({ card: c, state: getCutoffPaymentState(c, today) })),
    );
    const mxn = groups.find((g) => g.currency === "MXN");
    const usdGroup = groups.find((g) => g.currency === "USD");
    expect(mxn).toMatchObject({ currentPaymentDue: 1600, minimumPayment: 300, noInterestTarget: 1800, paymentCount: 2, needsStatementCount: 1 });
    expect(usdGroup).toMatchObject({ currentPaymentDue: 50, minimumPayment: 10, noInterestTarget: 60, paymentCount: 1, needsStatementCount: 0 });
  });
});
