import { describe, expect, it } from "vitest";
import { estimatePayable } from "./estimatedPayable";
import type { CreditCardOverviewItem } from "./credit-cards.types";

const NOW = new Date(2026, 9, 25);

function makeCard(overrides: {
  id?: string;
  currency?: string;
  isActive?: boolean;
  statement?: Partial<CreditCardOverviewItem["statementSummary"]>;
} = {}): CreditCardOverviewItem {
  return {
    id: overrides.id ?? "card",
    isActive: overrides.isActive ?? true,
    currency: overrides.currency ?? "MXN",
    closingDay: 15,
    createdAt: "2026-01-01T00:00:00Z",
    currentCycle: { spend: 0, expenseCount: 0 },
    creditStatus: { owedBalance: 0 },
    schedule: { nextClosingDate: "2026-11-15" },
    statementSummary: {
      statementImportId: "s",
      paymentStatus: "UNPAID",
      currentPaymentDue: 800,
      dueDate: "2026-11-05",
      nextClosePaymentEstimate: 300,
      ...overrides.statement,
    },
  } as unknown as CreditCardOverviewItem;
}

describe("estimatePayable", () => {
  it("adds the unpaid statement and the next-close estimate", () => {
    expect(estimatePayable([makeCard()], NOW)).toEqual([
      { currency: "MXN", statementDue: 800, nextClose: 300, total: 1100, cardCount: 1 },
    ]);
  });

  it("ignores a paid statement but keeps the next-close estimate", () => {
    const card = makeCard({ statement: { paymentStatus: "PAID", currentPaymentDue: 0 } });
    expect(estimatePayable([card], NOW)[0]).toMatchObject({ statementDue: 0, nextClose: 300, total: 300 });
  });

  it("skips inactive cards and groups by currency", () => {
    const cards = [
      makeCard({ id: "a" }),
      makeCard({ id: "b", isActive: false }),
      makeCard({ id: "c", currency: "USD", statement: { currentPaymentDue: 50, nextClosePaymentEstimate: 10 } }),
    ];
    expect(estimatePayable(cards, NOW)).toEqual([
      { currency: "MXN", statementDue: 800, nextClose: 300, total: 1100, cardCount: 1 },
      { currency: "USD", statementDue: 50, nextClose: 10, total: 60, cardCount: 1 },
    ]);
  });

  it("treats missing estimates as zero", () => {
    const card = makeCard({ statement: { nextClosePaymentEstimate: undefined } });
    expect(estimatePayable([card], NOW)[0].nextClose).toBe(0);
  });

  it("returns nothing when no active card owes anything", () => {
    const card = makeCard({ statement: { paymentStatus: "PAID", currentPaymentDue: 0, nextClosePaymentEstimate: 0 } });
    expect(estimatePayable([card], NOW)).toEqual([]);
  });
});
