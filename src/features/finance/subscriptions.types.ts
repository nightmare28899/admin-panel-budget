import type { Category } from "./finance.types";
import type { CreditCardSummary } from "./statement-import.types";

export const BILLING_CYCLE_VALUES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
export type BillingCycle = (typeof BILLING_CYCLE_VALUES)[number];

// Same PaymentMethod enum values the backend's payment-method.utils.ts
// normalizes to (and that Expense.paymentMethod already carries).
export const SUBSCRIPTION_PAYMENT_METHOD_VALUES = [
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "TRANSFER",
] as const;
export type SubscriptionPaymentMethod = (typeof SUBSCRIPTION_PAYMENT_METHOD_VALUES)[number];

export type Subscription = {
  id: string;
  name: string;
  cost: number | string;
  paymentMethod: string;
  creditCardId?: string | null;
  currency: string;
  billingCycle: BillingCycle;
  nextPaymentDate: string;
  reminderDays: number;
  lastReminderSentFor?: string | null;
  isActive: boolean;
  logoUrl?: string | null;
  hexColor?: string | null;
  categoryId?: string | null;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  creditCard?: CreditCardSummary | null;
  category?: Category | null;
};

export type CreateSubscriptionPayload = {
  name: string;
  cost: number;
  paymentMethod?: string;
  creditCardId?: string;
  currency?: string;
  billingCycle: BillingCycle;
  nextPaymentDate: string;
  reminderDays?: number;
  isActive?: boolean;
  categoryId?: string | null;
};

export type UpdateSubscriptionPayload = Partial<CreateSubscriptionPayload>;

// Mirrors SubscriptionsService.getMonthlyFactor on the backend so the
// frontend's "monthly recurring spend" stat matches the server-side math.
export function getMonthlyFactor(cycle: BillingCycle): number {
  switch (cycle) {
    case "DAILY":
      return 365 / 12;
    case "WEEKLY":
      return 52 / 12;
    case "YEARLY":
      return 1 / 12;
    case "MONTHLY":
    default:
      return 1;
  }
}

/**
 * Calendar-day distance from today to an ISO date string. Negative means
 * overdue, 0 means due today, positive means due in the future. Real
 * subscription dates now, so this is exact (no averaging/heuristics).
 */
export function daysUntil(isoDate: string, today: Date = new Date()): number {
  const target = new Date(isoDate);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000);
}
