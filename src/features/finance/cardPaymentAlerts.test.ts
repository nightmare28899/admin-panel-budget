import { describe, expect, it } from "vitest";
import { buildCardPaymentAlerts, buildCutoffStatementAlerts, cardPaymentDate } from "./cardPaymentAlerts";
import type { CreditCardOverviewItem } from "./credit-cards.types";

function card(overrides: Partial<CreditCardOverviewItem["statementSummary"]> = {}): CreditCardOverviewItem {
  return {
    id: "card", isActive: true,
    schedule: { nextPaymentDueDate: "2026-11-15" },
    statementSummary: { statementImportId: "statement", paymentStatus: "UNPAID", currentPaymentDue: 100, noInterestTarget: 200, dueDate: "2026-10-17", ...overrides },
  } as CreditCardOverviewItem;
}
const today = new Date(2026, 9, 14, 23, 59);

describe("card payment dates", () => {
  it("prioritizes the unpaid statement date over the schedule", () => {
    expect(cardPaymentDate(card())).toEqual({ kind: "statement", date: "2026-10-17" });
  });
  it("shows the scheduled date after payment or without a statement", () => {
    expect(cardPaymentDate(card({ paymentStatus: "PAID" }))).toEqual({ kind: "scheduled", date: "2026-11-15" });
    expect(cardPaymentDate(card({ statementImportId: null }))).toEqual({ kind: "scheduled", date: "2026-11-15" });
  });
  it("handles missing dates explicitly", () => {
    const item = card({ dueDate: null });
    item.schedule.nextPaymentDueDate = null;
    expect(cardPaymentDate(item)).toEqual({ kind: "missing" });
  });
  it("normalizes ISO calendar dates without moving them to the previous day", () => {
    expect(cardPaymentDate(card({ dueDate: "2026-10-17T00:00:00Z" }))).toEqual({ kind: "statement", date: "2026-10-17" });
  });
});

describe("platform card payment alerts", () => {
  it("includes three days ahead, today, and overdue in urgency order", () => {
    const items = [card(), card({ dueDate: "2026-10-14" }), card({ dueDate: "2026-10-10", paymentStatus: "PARTIAL" })];
    expect(buildCardPaymentAlerts(items, today).map((alert) => alert.daysUntilDue)).toEqual([-4, 0, 3]);
  });
  it("excludes future, inactive, paid, zero, negative, unknown and undated payments", () => {
    const inactive = { ...card(), isActive: false };
    expect(buildCardPaymentAlerts([
      inactive, card({ dueDate: "2026-10-18" }), card({ paymentStatus: "PAID" }),
      card({ currentPaymentDue: 0 }), card({ currentPaymentDue: -1 }),
      card({ currentPaymentDue: null, noInterestTarget: null }), card({ dueDate: null }),
      card({ dueDate: "bad" }), card({ dueDate: "2026-02-30" }), card({ statementImportId: null }),
    ], today)).toEqual([]);
  });
  it("uses a known positive target only when current payment is unavailable", () => {
    expect(buildCardPaymentAlerts([card({ currentPaymentDue: null })], today)[0].amount).toBe(200);
  });
  it("counts calendar days across month and DST boundaries", () => {
    expect(buildCardPaymentAlerts([card({ dueDate: "2026-11-02" })], new Date(2026, 9, 30, 23)).map((a) => a.daysUntilDue)).toEqual([3]);
  });
});

describe("cutoff-needs-statement alerts", () => {
  const needs = (id: string, extra: Partial<CreditCardOverviewItem> = {}) => ({
    ...card({ paymentStatus: "PAID", needsNewStatement: true }),
    id, closingDay: 10, ...extra,
  }) as CreditCardOverviewItem;

  it("alerts for a closed cycle without a statement, with no amount", () => {
    const alerts = buildCutoffStatementAlerts([needs("a")], today);
    expect(alerts).toEqual([{ card: expect.objectContaining({ id: "a" }), cutoffDate: "2026-10-10", daysSinceCutoff: 4 }]);
    expect(alerts[0]).not.toHaveProperty("amount");
  });
  it("orders by the oldest cutoff first and ignores inactive or up-to-date cards", () => {
    const old = needs("old", { closingDay: 1 });
    const inactive = { ...needs("off"), isActive: false } as CreditCardOverviewItem;
    const paid = card({ paymentStatus: "PAID", needsNewStatement: false });
    expect(buildCutoffStatementAlerts([needs("a"), old, inactive, paid], today).map((a) => a.card.id)).toEqual(["old", "a"]);
  });
  it("does not add cutoff cards to amount-based payment alerts", () => {
    expect(buildCardPaymentAlerts([needs("a")], today)).toEqual([]);
  });
});
