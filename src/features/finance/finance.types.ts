import type { LinkedCreditCardSummary } from "./statement-import.types";

export type CategoryUsage = {
  expenseCount: number;
  subscriptionCount: number;
  statementRowCount: number;
};
export type ExpensePaymentStatus = "PAID" | "PARTIAL" | "UNPAID";
export type Category = { id: string; name: string; icon?: string | null; color?: string | null; budgetAmount?: number | null; usage?: CategoryUsage };
export type FinancingPlan = { type: "NO_INTEREST" | "INTEREST_BEARING"; installmentNumber: number | null; installmentCount: number | null; installmentAmount: number | null; originalAmount: number | null; remainingAmount: number | null; purchaseDate: string | null };
export type Expense = { financingPlan?: FinancingPlan | null; id: string; title: string; cost: number | string; currency: string; date: string; note?: string | null; merchantName?: string | null; locationLabel?: string | null; category?: Category | null; categoryId?: string | null; paymentMethod?: string | null; isInstallment?: boolean; installmentGroupId?: string | null; installmentCount?: number | null; installmentIndex?: number | null; installmentTotalAmount?: number | string | null; installmentFirstPaymentDate?: string | null; installmentPurchaseDate?: string | null; imageUrl?: string | null; imagePresignedUrl?: string; creditCardId?: string | null; creditCard?: LinkedCreditCardSummary | null; statementRow?: { statementImportId: string; statementImport: { isPaid: boolean; paymentStatus: "PAID" | "PARTIAL" | "UNPAID"; sourceFileName?: string | null; periodStart?: string | null; periodEnd?: string | null } } | null; isSubscription?: boolean; subscriptionId?: string | null };
export type ExpenseWritePayload = { title: string; cost: string; currency: string; date?: string; categoryId: string; note?: string; merchantName?: string; locationLabel?: string; paymentMethod?: string; creditCardId?: string; isInstallment?: boolean; installmentCount?: number; installmentFrequency?: "MONTHLY"; installmentPurchaseDate?: string; installmentFirstPaymentDate?: string };
export type CategoryWritePayload = { name: string; icon?: string; color?: string; budgetAmount?: number };
export type ExpenseListResponse = { expenses: Expense[]; total: number; currencyBreakdown?: Array<{ currency: string; total: number }>; pagination: { page: number; limit: number; totalCount: number; totalPages: number; hasNext: boolean; hasPrev: boolean } };
export type Summary = { total: number; currency?: string | null; currencyBreakdown?: Array<{ currency: string; total: number }>; budgetAmount?: number; budgetPeriod?: BudgetPeriod; budgetPeriodStart?: string | null; budgetPeriodEnd?: string | null; spentInBudgetPeriod?: number; remaining?: number; percentage?: number; expenses?: Expense[] };
export const BUDGET_PERIODS = ["daily", "weekly", "monthly", "annual", "period"] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];
/** Subset of PATCH /users/me; dates (YYYY-MM-DD) are only valid with budgetPeriod "period". */
export type BudgetWritePayload = {
  budgetAmount: number;
  budgetPeriod?: BudgetPeriod;
  budgetPeriodStart?: string;
  budgetPeriodEnd?: string;
};
export type CurrencyTotal = { currency: string; total: number };
export type CardExpenseBreakdownGroup = {
  creditCardId: string | null;
  card: LinkedCreditCardSummary | null;
  expenseCount: number;
  totalsByCurrency: CurrencyTotal[];
};
export type CardExpenseBreakdownResponse = {
  from: string;
  to: string;
  totalCount: number;
  currencyBreakdown: CurrencyTotal[];
  groups: CardExpenseBreakdownGroup[];
};

export function toCalendarDate(value: string | null | undefined): string {
  const match = typeof value === "string"
    ? /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))?)?$/.exec(value)
    : null;

  if (!match) return "";

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  const hasValidDate = daysInMonth !== undefined && day >= 1 && day <= daysInMonth;
  const hasValidTime = hourText === undefined || (
    Number(hourText) <= 23
    && Number(minuteText) <= 59
    && Number(secondText) <= 59
  );
  const hasValidOffset = offsetHourText === undefined || (
    Number(offsetHourText) <= 23
    && Number(offsetMinuteText) <= 59
  );

  return hasValidDate && hasValidTime && hasValidOffset
    ? `${yearText}-${monthText}-${dayText}`
    : "";
}

export function formatCalendarDate(value: string | null | undefined): string {
  const calendarDate = toCalendarDate(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(calendarDate);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "—";
}
