import type { MessageKey } from "@/i18n/messages";
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

// Whole words only (accent/case-insensitive) so "Pagoda Store" is not flagged.
const CARD_PAYMENT_PATTERN = /\b(pagos?|abonos?|payments?)\b/;

/** Heuristic hint: notification text that reads like a card payment, not a purchase. */
export function looksLikeCardPayment(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return CARD_PAYMENT_PATTERN.test(normalized);
}

function localDay(millis: number) {
  const date = new Date(millis);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function detectedPurchasePaymentDefaults(purchase: DetectedPurchase) {
  return { amount: (purchase.amountCents / 100).toFixed(2), date: localDay(purchase.occurredAtMillis) };
}

/** Midday local keeps the chosen calendar day stable across time zones. */
export function paymentDateToIso(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12).toISOString();
}

/** Purchases carry no card reference, so only an unambiguous single card is preselected. */
export function defaultPaymentCardId(cards: ReadonlyArray<{ id: string }>) {
  return cards.length === 1 ? cards[0].id : "";
}

const CARD_PAYMENT_ERROR_KEYS: Record<string, MessageKey> = {
  STATEMENT_REQUIRED: "purchasePaymentStatementRequired",
  STATEMENT_ALREADY_PAID: "purchasePaymentStatementPaid",
  PAYMENT_CURRENCY_MISMATCH: "purchasePaymentCurrencyMismatch",
  CARD_NOT_FOUND: "purchasePaymentCardNotFound",
};

export function cardPaymentErrorKey(code: string | undefined): MessageKey | undefined {
  return code ? CARD_PAYMENT_ERROR_KEYS[code] : undefined;
}
