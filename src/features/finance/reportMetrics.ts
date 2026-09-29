import dayjs, { type Dayjs } from "dayjs";
import type {
  CardExpenseBreakdownResponse,
  Expense,
} from "./finance.types";
import { toCalendarDate } from "./finance.types";

export type ReportGranularity = "daily" | "weekly" | "monthly";

export type ReportBucket = {
  key: string;
  start: Dayjs;
  totalsByCurrency: Record<string, number>;
  countsByCurrency: Record<string, number>;
};

// Bounds request and render work; callers must expose incompleteness instead of truncating.
export const MAX_REPORT_PAGES = 100;
export const MAX_REPORT_BUCKETS = 4_000;

export function getEffectiveRangeEnd(selectedEnd: Dayjs, today = dayjs()) {
  return selectedEnd.startOf("day").isAfter(today.startOf("day"))
    ? today.endOf("day")
    : selectedEnd.endOf("day");
}

export function getPreviousRange(
  selectedStart: Dayjs,
  effectiveEnd: Dayjs,
): [Dayjs, Dayjs] {
  const inclusiveDays =
    effectiveEnd.startOf("day").diff(selectedStart.startOf("day"), "day") + 1;
  return [
    selectedStart.subtract(inclusiveDays, "day").startOf("day"),
    selectedStart.subtract(1, "day").endOf("day"),
  ];
}

function bucketStart(date: Dayjs, granularity: ReportGranularity) {
  if (granularity === "daily") return date.startOf("day");
  if (granularity === "weekly") return date.startOf("week");
  return date.startOf("month");
}

function bucketKey(date: Dayjs, granularity: ReportGranularity) {
  const start = bucketStart(date, granularity);
  return {
    key: start.format(granularity === "monthly" ? "YYYY-MM" : "YYYY-MM-DD"),
    start,
  };
}

export function buildReportBuckets(
  from: Dayjs,
  to: Dayjs,
  granularity: ReportGranularity,
  expenses: Expense[],
): { buckets: ReportBucket[]; complete: boolean } {
  if (from.startOf("day").isAfter(to.startOf("day"))) {
    return { buckets: [], complete: false };
  }

  const buckets: ReportBucket[] = [];
  let cursor = bucketStart(from, granularity);
  const lastKey = bucketKey(to, granularity).key;

  for (let index = 0; index < MAX_REPORT_BUCKETS; index += 1) {
    const { key, start } = bucketKey(cursor, granularity);
    buckets.push({
      key,
      start,
      totalsByCurrency: {},
      countsByCurrency: {},
    });
    if (key === lastKey) break;
    cursor = cursor.add(
      1,
      granularity === "daily"
        ? "day"
        : granularity === "weekly"
          ? "week"
          : "month",
    );
  }

  const complete = buckets.at(-1)?.key === lastKey;
  if (!complete) return { buckets, complete: false };

  const bucketsByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const expense of expenses) {
    const calendarDate = toCalendarDate(expense.date);
    if (!calendarDate) continue;
    const bucket = bucketsByKey.get(bucketKey(dayjs(calendarDate), granularity).key);
    if (!bucket) continue;
    const cost = typeof expense.cost === "string" ? Number(expense.cost) : expense.cost;
    if (!Number.isFinite(cost)) continue;
    bucket.totalsByCurrency[expense.currency] =
      (bucket.totalsByCurrency[expense.currency] ?? 0) + cost;
    bucket.countsByCurrency[expense.currency] =
      (bucket.countsByCurrency[expense.currency] ?? 0) + 1;
  }

  return { buckets, complete: true };
}

export function resolvePrimaryCurrency(
  configuredCurrency: string | undefined,
  observedCurrencies: string[],
): string | null {
  const currencies = Array.from(new Set(observedCurrencies)).sort();
  if (configuredCurrency && currencies.includes(configuredCurrency)) {
    return configuredCurrency;
  }
  return currencies.length === 1 ? currencies[0] : null;
}

export function isCardBreakdownReconciled(
  breakdown: CardExpenseBreakdownResponse,
  tolerance = 0.01,
) {
  const groupCount = breakdown.groups.reduce(
    (sum, group) => sum + group.expenseCount,
    0,
  );
  if (groupCount !== breakdown.totalCount) return false;

  const expectedTotals = new Map(
    breakdown.currencyBreakdown.map((item) => [item.currency, item.total]),
  );
  const groupTotals = new Map<string, number>();
  for (const group of breakdown.groups) {
    for (const item of group.totalsByCurrency) {
      groupTotals.set(
        item.currency,
        (groupTotals.get(item.currency) ?? 0) + item.total,
      );
    }
  }

  if (expectedTotals.size !== groupTotals.size) return false;
  return Array.from(expectedTotals.entries()).every(
    ([currency, total]) =>
      Number.isFinite(total) &&
      Number.isFinite(groupTotals.get(currency)) &&
      Math.abs((groupTotals.get(currency) ?? 0) - total) <= tolerance,
  );
}
