export type Category = { id: string; name: string; icon?: string | null; color?: string | null; budgetAmount?: number | null };
export type Expense = { id: string; title: string; cost: number | string; currency: string; date: string; note?: string | null; merchantName?: string | null; locationLabel?: string | null; category?: Category | null; categoryId?: string | null; paymentMethod?: string | null; isInstallment?: boolean; installmentCount?: number | null; imageUrl?: string | null; imagePresignedUrl?: string };
export type ExpenseWritePayload = { title: string; cost: string; currency: string; date?: string; categoryId: string; note?: string; merchantName?: string; locationLabel?: string };
export type CategoryWritePayload = { name: string; icon?: string; color?: string; budgetAmount?: number };
export type ExpenseListResponse = { expenses: Expense[]; total: number; currencyBreakdown?: Array<{ currency: string; total: number }>; pagination: { page: number; limit: number; totalCount: number; totalPages: number; hasNext: boolean; hasPrev: boolean } };
export type Summary = { total: number; currency?: string | null; currencyBreakdown?: Array<{ currency: string; total: number }>; budgetAmount?: number; spentInBudgetPeriod?: number; remaining?: number; percentage?: number; expenses?: Expense[] };

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
