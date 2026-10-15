import { describe, expect, it } from "vitest";
import { buildCardPaymentAlerts, cardPaymentDate } from "./cardPaymentAlerts";
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
