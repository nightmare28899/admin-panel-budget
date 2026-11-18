import { describe, expect, it } from "vitest";
import { loadSubscriptionAlerts } from "./subscriptionAlerts";
import type { Subscription } from "./subscriptions.types";

const today = new Date(2026, 9, 14);
const subscription: Subscription = {
  id: "subscription", name: "Streaming", cost: "99", currency: "MXN",
  paymentMethod: "CREDIT_CARD", billingCycle: "MONTHLY",
  nextPaymentDate: "2026-10-16T12:00:00", reminderDays: 3, isActive: true,
};

describe("subscription notification loading", () => {
  it("distinguishes an empty successful response from a failure", async () => {
    expect(await loadSubscriptionAlerts(async () => ({ data: [] }), today))
      .toEqual({ status: "ready", alerts: [] });
  });

  it.each([
    { error: "requestFailedGeneric" },
    { sessionExpired: true },
    {},
    { data: [subscription], error: "requestFailedGeneric" },
    { data: [subscription], sessionExpired: true },
  ])("does not report unavailable data as no notifications: %j", async (result) => {
    expect(await loadSubscriptionAlerts(async () => result, today))
      .toEqual({ status: "error", alerts: [] });
  });

  it("handles rejected requests without an unhandled rejection", async () => {
    expect(await loadSubscriptionAlerts(async () => { throw new Error("offline"); }, today))
      .toEqual({ status: "error", alerts: [] });
  });

  it("retains due alerts in urgency order and excludes inactive or distant payments", async () => {
    const result = await loadSubscriptionAlerts(async () => ({ data: [
      subscription,
      { ...subscription, id: "overdue", nextPaymentDate: "2026-10-13T12:00:00" },
      { ...subscription, id: "today", nextPaymentDate: "2026-10-14T12:00:00" },
      { ...subscription, id: "inactive", isActive: false },
      { ...subscription, id: "later", nextPaymentDate: "2026-10-22T12:00:00" },
    ] }), today);
    expect(result.status).toBe("ready");
    expect(result.alerts.map(({ key, daysUntil, status, amount }) => ({ key, daysUntil, status, amount })))
      .toEqual([
        { key: "overdue", daysUntil: -1, status: "overdue", amount: 99 },
        { key: "today", daysUntil: 0, status: "due-soon", amount: 99 },
        { key: "subscription", daysUntil: 2, status: "due-soon", amount: 99 },
      ]);
  });
});
