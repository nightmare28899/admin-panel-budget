"use client";

import { DatePicker, Segmented } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ChartSkeleton, MetricCardsSkeleton } from "@/components/ui/ContentSkeleton";
import { getExpensesAction, getUserMeAction } from "@/lib/userActions";
import { toCalendarDate } from "./finance.types";
import type { Expense } from "./finance.types";

type Granularity = "daily" | "weekly" | "monthly";

type Bucket = {
  key: string;
  label: string;
  start: Dayjs;
  totalsByCurrency: Record<string, number>;
  count: number;
};

const GRANULARITY_OPTIONS: { label: string; value: Granularity }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

function bucketKeyFor(date: Dayjs, granularity: Granularity): { key: string; start: Dayjs } {
  if (granularity === "daily") {
    const start = date.startOf("day");
    return { key: start.format("YYYY-MM-DD"), start };
  }
  if (granularity === "weekly") {
    const start = date.startOf("week");
    return { key: start.format("YYYY-MM-DD"), start };
  }
  const start = date.startOf("month");
  return { key: start.format("YYYY-MM"), start };
}

function labelFor(start: Dayjs, granularity: Granularity): string {
  if (granularity === "daily") return start.format("MMM D");
  if (granularity === "weekly") return start.format("MMM D");
  return start.format("MMM YYYY");
}

function buildEmptyBuckets(from: Dayjs, to: Dayjs, granularity: Granularity): Bucket[] {
  const buckets: Bucket[] = [];
  let cursor = bucketKeyFor(from, granularity).start;
  const lastKey = bucketKeyFor(to, granularity).key;

  // Safety cap so a bad range can never produce a runaway loop.
  for (let i = 0; i < 400; i += 1) {
    const { key, start } = bucketKeyFor(cursor, granularity);
    buckets.push({ key, label: labelFor(start, granularity), start, totalsByCurrency: {}, count: 0 });
    if (key === lastKey) break;
    cursor = granularity === "daily" ? cursor.add(1, "day") : granularity === "weekly" ? cursor.add(1, "week") : cursor.add(1, "month");
  }
  return buckets;
}

export function ReportsView() {
  const router = useRouter();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(29, "day").startOf("day"), dayjs().endOf("day")]);
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(
    async (from: Dayjs, to: Dayjs) => {
      setLoading(true);
      setError(undefined);

      const profile = await getUserMeAction();
      if (profile.error || !profile.data?.user?.isActive) {
        router.push("/user-login");
        return;
      }

      const collected: Expense[] = [];
      let page = 1;
      // Safety cap: this account has well under a thousand records; this bound
      // just guards against ever looping on unexpected data.
      for (let i = 0; i < 10; i += 1) {
        const params = new URLSearchParams({
          page: String(page),
          limit: "100",
          from: from.format("YYYY-MM-DD"),
          to: to.format("YYYY-MM-DD"),
        });
        const result = await getExpensesAction(params.toString());
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }
        collected.push(...(result.data?.expenses ?? []));
        if (!result.data?.pagination.hasNext) break;
        page += 1;
      }

      setExpenses(collected);
      setLoading(false);
    },
    [router],
  );

  useEffect(() => {
    void load(range[0], range[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const buckets = useMemo(() => {
    const empty = buildEmptyBuckets(range[0], range[1], granularity);
    const byKey = new Map(empty.map((bucket) => [bucket.key, bucket]));

    for (const expense of expenses) {
      const calendarDate = toCalendarDate(expense.date);
      if (!calendarDate) continue;
      const { key } = bucketKeyFor(dayjs(calendarDate), granularity);
      const bucket = byKey.get(key);
      if (!bucket) continue;
      const cost = typeof expense.cost === "string" ? parseFloat(expense.cost) : expense.cost;
      if (Number.isNaN(cost)) continue;
      bucket.totalsByCurrency[expense.currency] = (bucket.totalsByCurrency[expense.currency] ?? 0) + cost;
      bucket.count += 1;
    }

    return Array.from(byKey.values());
  }, [expenses, granularity, range]);

  const currencyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const bucket of buckets) {
      for (const [currency, amount] of Object.entries(bucket.totalsByCurrency)) {
        totals[currency] = (totals[currency] ?? 0) + amount;
      }
    }
    return totals;
  }, [buckets]);

  const currencies = Object.keys(currencyTotals);
  const primaryCurrency = currencies[0];
  const grandTotal = primaryCurrency ? currencyTotals[primaryCurrency] : 0;
  const bucketCount = buckets.length || 1;
  const averagePerBucket = grandTotal / bucketCount;
  const transactionCount = expenses.length;

  const maxBucketTotal = Math.max(
    1,
    ...buckets.map((bucket) => (primaryCurrency ? bucket.totalsByCurrency[primaryCurrency] ?? 0 : 0)),
  );

  const showAllLabels = buckets.length <= 16;
  const labelStride = Math.max(1, Math.ceil(buckets.length / 10));

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">Spending reports</h1>
          <p className="mt-0.5 text-sm text-[var(--text-3)]">
            Daily, weekly, and monthly totals from your expense history.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(undefined)}
            aria-label="Dismiss error"
            className="shrink-0 cursor-pointer text-[var(--rose)]/70 transition-colors hover:text-[var(--rose)]"
          >
            ✕
          </button>
        </div>
      )}

      <Card className="!p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <DatePicker.RangePicker
            aria-label="Report date range"
            value={range}
            allowClear={false}
            presets={[
              { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
              { label: "This week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
              { label: "This month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
              { label: "Last 30 days", value: [dayjs().subtract(29, "day").startOf("day"), dayjs().endOf("day")] },
            ]}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setRange([dates[0].startOf("day"), dates[1].endOf("day")]);
              }
            }}
          />
          <Segmented
            aria-label="Bucket granularity"
            options={GRANULARITY_OPTIONS}
            value={granularity}
            onChange={(value) => setGranularity(value as Granularity)}
          />
        </div>
      </Card>

      {loading ? (
        <MetricCardsSkeleton count={3} className="mb-4 md:grid-cols-3" />
      ) : (
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card className="!p-4">
            <p className="mb-1 text-[11px] uppercase tracking-[0.04em] text-[var(--text-3)]">
              Total spent
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[22px] font-medium tabular-nums text-[var(--text-1)]">
                {primaryCurrency ? grandTotal.toFixed(2) : "—"}
              </span>
              {primaryCurrency && <span className="text-xs text-[var(--text-3)]">{primaryCurrency}</span>}
            </div>
          </Card>
          <Card className="!p-4">
            <p className="mb-1 text-[11px] uppercase tracking-[0.04em] text-[var(--text-3)]">
              Average per {granularity === "daily" ? "day" : granularity === "weekly" ? "week" : "month"}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[22px] font-medium tabular-nums text-[var(--text-1)]">
                {primaryCurrency ? averagePerBucket.toFixed(2) : "—"}
              </span>
              {primaryCurrency && <span className="text-xs text-[var(--text-3)]">{primaryCurrency}</span>}
            </div>
          </Card>
          <Card className="!p-4">
            <p className="mb-1 text-[11px] uppercase tracking-[0.04em] text-[var(--text-3)]">
              Transactions
            </p>
            <span className="font-mono text-[22px] font-medium tabular-nums text-[var(--text-1)]">
              {transactionCount}
            </span>
          </Card>
        </div>
      )}

      {currencies.length > 1 && (
        <Card className="!p-4 mb-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.04em] text-[var(--text-3)]">
            Other currencies in range
          </p>
          <div className="flex flex-wrap gap-4">
            {currencies.slice(1).map((currency) => (
              <span key={currency} className="font-mono text-sm text-[var(--text-2)]">
                {currencyTotals[currency].toFixed(2)} {currency}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card className="!p-4" title="Spending over time">
        {loading ? (
          <ChartSkeleton />
        ) : buckets.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-3)]">No data in this range.</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg
              role="img"
              aria-label="Bar chart of spending per bucket"
              viewBox={`0 0 ${Math.max(320, buckets.length * 40)} 220`}
              className="h-[220px] w-full min-w-[320px]"
              preserveAspectRatio="none"
            >
              <line x1="0" y1="188" x2={Math.max(320, buckets.length * 40)} y2="188" stroke="var(--border-soft)" strokeWidth="1" />
              {buckets.map((bucket, index) => {
                const barWidth = Math.max(320, buckets.length * 40) / buckets.length;
                const value = primaryCurrency ? bucket.totalsByCurrency[primaryCurrency] ?? 0 : 0;
                const barHeight = maxBucketTotal > 0 ? (value / maxBucketTotal) * 160 : 0;
                const x = index * barWidth + barWidth * 0.2;
                const width = barWidth * 0.6;
                const y = 188 - barHeight;
                const showLabel = showAllLabels || index % labelStride === 0;
                return (
                  <g key={bucket.key}>
                    <title>
                      {bucket.label}: {value.toFixed(2)} {primaryCurrency ?? ""} ({bucket.count} transaction
                      {bucket.count === 1 ? "" : "s"})
                    </title>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={Math.max(barHeight, value > 0 ? 2 : 0)}
                      rx="3"
                      fill="var(--emerald)"
                      opacity={value > 0 ? 1 : 0.15}
                    />
                    {showLabel && (
                      <text
                        x={x + width / 2}
                        y="204"
                        textAnchor="middle"
                        fontSize="9"
                        fill="var(--text-3)"
                      >
                        {bucket.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </Card>
    </div>
  );
}
