import type { ExpenseWritePayload } from "../finance.types";
import type { DetectedPurchase } from "../interfaces/detected-purchases";

export const DETECTED_PURCHASES_CHANGED_EVENT = "finance:detected-purchases-changed";

export function pendingPurchaseQuery(page: number, limit = 20) {
  return new URLSearchParams({ status: "PENDING", page: String(page), limit: String(limit) }).toString();
}

export function detectedPurchaseExpense(purchase: DetectedPurchase, fallbackTitle: string): Partial<ExpenseWritePayload> {
  const date = new Date(purchase.occurredAtMillis);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    title: purchase.merchant || fallbackTitle,
    merchantName: purchase.merchant ?? undefined,
    cost: (purchase.amountCents / 100).toFixed(2),
    currency: purchase.currency,
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    paymentMethod: "CREDIT_CARD",
  };
}

/** Blocks repeated submissions before React has rendered the pending state. */
export function createPurchaseMutationGuard() {
  let pending = false;
  return async (operation: () => Promise<boolean>) => {
    if (pending) return false;
    pending = true;
    try { return await operation(); }
    finally { pending = false; }
  };
}
