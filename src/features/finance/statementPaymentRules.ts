import type { MessageKey } from "@/i18n/messages";
import type { StatementPayment } from "./statement-import.types";

export const EARLIEST_PAYMENT_DATE = "2000-01-01";

/** The viewer's calendar day as YYYY-MM-DD (toISOString() would jump a day in the evening for negative UTC offsets). */
export function localToday(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export type PaymentDraft = {
  amount: number | null;
  /** YYYY-MM-DD */
  paidAt: string;
  currency: string;
  statementCurrency?: string | null;
};

/** Mirrors the backend rules for a new statement payment. Returns a message key or null when valid. */
export function validatePaymentDraft(draft: PaymentDraft, today: string = localToday()): MessageKey | null {
  const { amount } = draft;
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return "cardAbonoErrAmount";
  const cents = amount * 100;
  if (Math.abs(cents - Math.round(cents)) > 1e-6 || Math.round(cents) < 1) return "cardAbonoErrAmount";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.paidAt) || draft.paidAt < EARLIEST_PAYMENT_DATE || draft.paidAt > today) {
    return "cardAbonoErrDate";
  }
  if (!/^[A-Z]{3}$/.test(draft.currency)) return "cardAbonoErrCurrency";
  if (draft.statementCurrency && draft.currency !== draft.statementCurrency) return "cardAbonoErrCurrency";
  return null;
}

/** True when the amount exceeds what is still pending (compared in cents). */
export function isOverpayment(amount: number, remaining: number | null | undefined): boolean {
  if (remaining == null) return false;
  return Math.round(amount * 100) > Math.round(remaining * 100);
}

export type PaymentErrorInfo = {
  /** Friendly message key; null when the backend text should be shown as is. */
  key: MessageKey | null;
  /** The ledger moved on (or is unknown): refetch the statement detail before retrying. */
  refetch: boolean;
};

const PAYMENT_ERROR_RULES: Array<{ pattern: RegExp; key: MessageKey; refetch: boolean }> = [
  { pattern: /already fully paid/i, key: "cardAbonoErrPaid", refetch: true },
  { pattern: /payment version is stale|changed concurrently/i, key: "cardAbonoErrStale", refetch: true },
  { pattern: /between 2000-01-01 and today/i, key: "cardAbonoErrDate", refetch: false },
  { pattern: /confirmed statement with a reconciliation/i, key: "cardAbonoErrNotConfirmed", refetch: true },
  { pattern: /currency does not match/i, key: "cardAbonoErrCurrency", refetch: false },
  { pattern: /idempotency key is already in use/i, key: "cardAbonoErrIdempotency", refetch: true },
];

export function mapStatementPaymentError(message: string | undefined): PaymentErrorInfo {
  const rule = message ? PAYMENT_ERROR_RULES.find((candidate) => candidate.pattern.test(message)) : undefined;
  return rule ? { key: rule.key, refetch: rule.refetch } : { key: null, refetch: true };
}

export type PaymentLedgerStatus = "active" | "corrected" | "voided";

export function paymentLedgerStatus(payment: StatementPayment, payments: StatementPayment[]): PaymentLedgerStatus {
  if (payments.some((other) => other.supersedesId === payment.id)) return "corrected";
  return payment.voidedAt ? "voided" : "active";
}

/** Newest payments first by payment date, then creation time. */
export function latestPayments(payments: StatementPayment[], count: number): StatementPayment[] {
  return [...payments]
    .sort((left, right) => right.paidAt.localeCompare(left.paidAt) || right.createdAt.localeCompare(left.createdAt))
    .slice(0, count);
}
