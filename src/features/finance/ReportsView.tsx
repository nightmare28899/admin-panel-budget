"use client";

import { DatePicker, Segmented } from "antd";
import {
  BarChartOutlined,
  CreditCardOutlined,
  SwapOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  ChartSkeleton,
  MetricCardsSkeleton,
} from "@/components/ui/ContentSkeleton";
import { Sparkline, TrendBadge } from "@/components/ui/TrendBadge";
import type { Delta } from "@/components/ui/TrendBadge";
import {
  getCardExpenseBreakdownAction,
  getExpensesAction,
  getUserMeAction,
} from "@/lib/userActions";
import type {
  CardExpenseBreakdownResponse,
  Expense,
} from "./finance.types";
import {
  buildReportBuckets,
  getEffectiveRangeEnd,
  getPreviousRange,
  isCardBreakdownReconciled,
  MAX_REPORT_PAGES,
  resolvePrimaryCurrency,
  type ReportGranularity,
} from "./reportMetrics";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";

type ExpenseRangeResult = {
  expenses: Expense[];
  complete: boolean;
  error?: string;
};

function isGranularity(
  value: string | number,
): value is ReportGranularity {
  return value === "daily" || value === "weekly" || value === "monthly";
}

function computeDelta(current: number, previous: number): Delta {
  if (previous === 0) {
    return { pct: null, direction: current === 0 ? "flat" : "up" };
  }
  const pct = ((current - previous) / previous) * 100;
  return {
    pct,
    direction: pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat",
  };
}

async function fetchExpensesInRange(
  from: Dayjs,
  to: Dayjs,
): Promise<ExpenseRangeResult> {
  const expenses: Expense[] = [];

  for (let page = 1; page <= MAX_REPORT_PAGES; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      limit: "100",
      from: from.format("YYYY-MM-DD"),
      to: to.format("YYYY-MM-DD"),
    });
    const result = await getExpensesAction(params.toString());
    if (result.error || !result.data) {
      return { expenses, complete: false, error: result.error };
    }

    expenses.push(...result.data.expenses);
    if (!result.data.pagination.hasNext) {
      return {
        expenses,
        complete: expenses.length >= result.data.pagination.totalCount,
      };
    }
  }

  return { expenses, complete: false };
}

function sumCurrency(expenses: Expense[], currency: string | null) {
  if (!currency) return 0;
  return expenses.reduce((sum, expense) => {
    if (expense.currency !== currency) return sum;
    const cost = typeof expense.cost === "string" ? Number(expense.cost) : expense.cost;
    return Number.isFinite(cost) ? sum + cost : sum;
  }, 0);
}

export function ReportsView() {
  const router = useRouter();
  const { t, formatDate, formatNumber } = useLocale();
  const requestSequence = useRef(0);
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(29, "day").startOf("day"),
    dayjs().endOf("day"),
  ]);
  const [granularity, setGranularity] =
    useState<ReportGranularity>("daily");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [previousExpenses, setPreviousExpenses] = useState<Expense[]>([]);
  const [configuredCurrency, setConfiguredCurrency] = useState<string>();
  const [cardBreakdown, setCardBreakdown] =
    useState<CardExpenseBreakdownResponse>();
  const [currentComplete, setCurrentComplete] = useState(true);
  const [comparisonComplete, setComparisonComplete] = useState(false);
  const [comparisonAvailable, setComparisonAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [cardError, setCardError] = useState<string>();

  const effectiveEnd = useMemo(
    () => getEffectiveRangeEnd(range[1]),
    [range],
  );
  const previousRange = useMemo(
    () => getPreviousRange(range[0], effectiveEnd),
    [effectiveEnd, range],
  );

  useEffect(() => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setLoading(true);
    setError(undefined);
    setCardError(undefined);
    setPreviousExpenses([]);
    setComparisonAvailable(false);
    setCardBreakdown(undefined);

    void (async () => {
      const profile = await getUserMeAction();
      if (sequence !== requestSequence.current) return;
      if (profile.error || !profile.data?.user?.isActive) {
        router.push("/user-login");
        return;
      }

      setConfiguredCurrency(profile.data.user.currency);
      if (range[0].startOf("day").isAfter(effectiveEnd.startOf("day"))) {
        setExpenses([]);
        setCurrentComplete(false);
        setComparisonComplete(false);
        setLoading(false);
        return;
      }

      const cardQuery = new URLSearchParams({
        from: range[0].format("YYYY-MM-DD"),
        to: effectiveEnd.format("YYYY-MM-DD"),
      });
      const [currentResult, previousResult, cardResult] = await Promise.all([
        fetchExpensesInRange(range[0], effectiveEnd),
        fetchExpensesInRange(previousRange[0], previousRange[1]),
        getCardExpenseBreakdownAction(cardQuery.toString()),
      ]);
      if (sequence !== requestSequence.current) return;

      if (currentResult.error) {
        setExpenses([]);
        setCurrentComplete(false);
        setError(
          frontendError(currentResult.error, t, "requestFailedGeneric"),
        );
      } else {
        setExpenses(currentResult.expenses);
        setCurrentComplete(currentResult.complete);
      }

      if (previousResult.error) {
        setPreviousExpenses([]);
        setComparisonAvailable(false);
        setComparisonComplete(false);
      } else {
        setPreviousExpenses(previousResult.expenses);
        setComparisonAvailable(true);
        setComparisonComplete(previousResult.complete);
      }

      if (cardResult.error || !cardResult.data) {
        setCardError(
          frontendError(cardResult.error, t, "requestFailedGeneric"),
        );
      } else {
        setCardBreakdown(cardResult.data);
      }
      setLoading(false);
    })();
  }, [effectiveEnd, previousRange, range, router, t]);

  const currentBucketResult = useMemo(
    () => buildReportBuckets(range[0], effectiveEnd, granularity, expenses),
    [effectiveEnd, expenses, granularity, range],
  );
  const previousBucketResult = useMemo(
    () =>
      buildReportBuckets(
        previousRange[0],
        previousRange[1],
        granularity,
        previousExpenses,
      ),
    [granularity, previousExpenses, previousRange],
  );
  const cardIntegrityValid = cardBreakdown
    ? isCardBreakdownReconciled(cardBreakdown)
    : true;
  const observedCurrencies = cardIntegrityValid && cardBreakdown
    ? cardBreakdown.currencyBreakdown.map((item) => item.currency)
    : expenses.map((expense) => expense.currency);
  const primaryCurrency = resolvePrimaryCurrency(
    configuredCurrency,
    observedCurrencies,
  );
  const reportComplete =
    currentComplete &&
    currentBucketResult.complete &&
    (!comparisonAvailable ||
      (comparisonComplete && previousBucketResult.complete));
  const buckets = currentBucketResult.buckets;
  const currencyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const bucket of buckets) {
      for (const [currency, amount] of Object.entries(
        bucket.totalsByCurrency,
      )) {
        totals[currency] = (totals[currency] ?? 0) + amount;
      }
    }
    return totals;
  }, [buckets]);
  const currencies = Object.keys(currencyTotals).sort();
  const grandTotal = primaryCurrency ? currencyTotals[primaryCurrency] ?? 0 : 0;
  const averagePerBucket = grandTotal / Math.max(1, buckets.length);
  const transactionCount = primaryCurrency
    ? expenses.filter((expense) => expense.currency === primaryCurrency).length
    : 0;
  const previousGrandTotal = sumCurrency(previousExpenses, primaryCurrency);
  const previousAveragePerBucket =
    previousGrandTotal / Math.max(1, previousBucketResult.buckets.length);
  const previousTransactionCount = primaryCurrency
    ? previousExpenses.filter(
        (expense) => expense.currency === primaryCurrency,
      ).length
    : 0;
  const totalSpentDelta = computeDelta(grandTotal, previousGrandTotal);
  const averageDelta = computeDelta(
    averagePerBucket,
    previousAveragePerBucket,
  );
  const transactionsDelta = computeDelta(
    transactionCount,
    previousTransactionCount,
  );
  const bucketTotalsSeries = buckets.map((bucket) =>
    primaryCurrency ? bucket.totalsByCurrency[primaryCurrency] ?? 0 : 0,
  );
  const bucketCountsSeries = buckets.map((bucket) =>
    primaryCurrency ? bucket.countsByCurrency[primaryCurrency] ?? 0 : 0,
  );
  const maxBucketTotal = Math.max(1, ...bucketTotalsSeries);
  const showAllLabels = buckets.length <= 16;
  const labelStride = Math.max(1, Math.ceil(buckets.length / 10));
  const canCompare = comparisonAvailable && reportComplete && primaryCurrency;
  const cardCurrencyTotal =
    cardBreakdown?.currencyBreakdown.find(
      (item) => item.currency === primaryCurrency,
    )?.total ?? 0;
  const granularityOptions: { label: string; value: ReportGranularity }[] = [
    { label: t("daily"), value: "daily" },
    { label: t("weekly"), value: "weekly" },
    { label: t("monthly"), value: "monthly" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">
            {t("spendingReports")}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-3)]">
            {t("reportsDescription")}
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
            aria-label={t("dismissError")}
            className="shrink-0 cursor-pointer text-[var(--rose)]/70 transition-colors hover:text-[var(--rose)]"
          >
            ✕
          </button>
        </div>
      )}

      {!loading && !reportComplete && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-3 text-sm text-[var(--text-2)]"
        >
          {t("reportIncompleteData")}
        </div>
      )}

      <Card className="!p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <DatePicker.RangePicker
            aria-label={t("reportDateRange")}
            value={range}
            allowClear={false}
            presets={[
              {
                label: t("today"),
                value: [dayjs().startOf("day"), dayjs().endOf("day")],
              },
              {
                label: t("thisWeek"),
                value: [dayjs().startOf("week"), dayjs().endOf("week")],
              },
              {
                label: t("thisMonthPreset"),
                value: [dayjs().startOf("month"), dayjs().endOf("month")],
              },
              {
                label: t("last30Days"),
                value: [
                  dayjs().subtract(29, "day").startOf("day"),
                  dayjs().endOf("day"),
                ],
              },
            ]}
            onChange={(dates) => {
              if (dates?.[0] && dates[1]) {
                setRange([dates[0].startOf("day"), dates[1].endOf("day")]);
              }
            }}
          />
          <Segmented
            aria-label={t("bucketGranularity")}
            options={granularityOptions}
            value={granularity}
            onChange={(value) => {
              if (isGranularity(value)) setGranularity(value);
            }}
          />
        </div>
      </Card>

      {loading ? (
        <MetricCardsSkeleton count={3} className="mb-4 md:grid-cols-3" />
      ) : (
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard
            tone="info"
            icon={<WalletOutlined />}
            label={t("totalSpent")}
            unit={reportComplete ? primaryCurrency ?? undefined : undefined}
            value={
              reportComplete && primaryCurrency
                ? formatNumber(grandTotal, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"
            }
            trend={canCompare && <TrendBadge delta={totalSpentDelta} />}
            sparkline={
              reportComplete && primaryCurrency ? (
                <Sparkline
                  values={bucketTotalsSeries}
                  favorable={totalSpentDelta.direction}
                />
              ) : undefined
            }
          />
          <StatCard
            tone="gold"
            icon={<BarChartOutlined />}
            label={t("averagePer", {
              period: t(
                granularity === "daily"
                  ? "dayPeriod"
                  : granularity === "weekly"
                    ? "weekPeriod"
                    : "monthPeriod",
              ),
            })}
            unit={reportComplete ? primaryCurrency ?? undefined : undefined}
            value={
              reportComplete && primaryCurrency
                ? formatNumber(averagePerBucket, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"
            }
            trend={canCompare && <TrendBadge delta={averageDelta} />}
            sparkline={
              reportComplete && primaryCurrency ? (
                <Sparkline
                  values={bucketTotalsSeries}
                  favorable={averageDelta.direction}
                />
              ) : undefined
            }
          />
          <StatCard
            tone="emerald"
            icon={<SwapOutlined />}
            label={t("transactions")}
            value={
              reportComplete && primaryCurrency
                ? formatNumber(transactionCount)
                : "—"
            }
            trend={canCompare && <TrendBadge delta={transactionsDelta} />}
            sparkline={
              reportComplete && primaryCurrency ? (
                <Sparkline
                  values={bucketCountsSeries}
                  favorable={transactionsDelta.direction}
                />
              ) : undefined
            }
          />
        </div>
      )}

      {!loading && reportComplete && !primaryCurrency && expenses.length > 0 && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--text-2)]"
        >
          {t("reportPrimaryCurrencyUnavailable")}
        </div>
      )}

      {!loading && reportComplete && currencies.length > 1 && (
        <Card className="!p-4 mb-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.04em] text-[var(--text-3)]">
            {t("otherCurrencies")}
          </p>
          <div className="flex flex-wrap gap-4">
            {currencies
              .filter((currency) => currency !== primaryCurrency)
              .map((currency) => (
                <span
                  key={currency}
                  className="font-mono text-sm text-[var(--text-2)]"
                >
                  {formatNumber(currencyTotals[currency], {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {currency}
                </span>
              ))}
          </div>
        </Card>
      )}

      <Card className="!p-4 mb-4" title={t("spendingOverTime")}>
        {loading ? (
          <ChartSkeleton />
        ) : !reportComplete ? (
          <p className="py-8 text-center text-sm text-[var(--text-3)]">
            {t("reportIncompleteData")}
          </p>
        ) : expenses.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-3)]">
            {t("noDataRange")}
          </p>
        ) : !primaryCurrency ? (
          <p className="py-8 text-center text-sm text-[var(--text-3)]">
            {t("reportPrimaryCurrencyUnavailable")}
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg
              role="img"
              aria-label={t("spendingBarChart")}
              viewBox={`0 0 ${Math.max(320, buckets.length * 40)} 220`}
              className="h-[220px] w-full min-w-[320px]"
              preserveAspectRatio="none"
            >
              <line
                x1="0"
                y1="188"
                x2={Math.max(320, buckets.length * 40)}
                y2="188"
                stroke="var(--border-soft)"
                strokeWidth="1"
              />
              {buckets.map((bucket, index) => {
                const chartWidth = Math.max(320, buckets.length * 40);
                const barWidth = chartWidth / buckets.length;
                const value = bucket.totalsByCurrency[primaryCurrency] ?? 0;
                const count = bucket.countsByCurrency[primaryCurrency] ?? 0;
                const barHeight = (value / maxBucketTotal) * 160;
                const x = index * barWidth + barWidth * 0.2;
                const width = barWidth * 0.6;
                const y = 188 - barHeight;
                const showLabel = showAllLabels || index % labelStride === 0;
                const label = formatDate(
                  bucket.start.toDate(),
                  granularity === "monthly"
                    ? { month: "short", year: "numeric" }
                    : { month: "short", day: "numeric" },
                );
                return (
                  <g key={bucket.key}>
                    <title>
                      {t("chartTitle", {
                        label,
                        value: formatNumber(value, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }),
                        currency: primaryCurrency ?? "",
                        count: formatNumber(count),
                        transactions: t(
                          count === 1
                            ? "transactionWord"
                            : "transactionsWord",
                        ),
                      })}
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
                        {label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </Card>

      <Card className="!p-4" title={t("cardExpenseBreakdown")}>
        <div className="mb-4 flex items-start gap-3">
          <CreditCardOutlined className="mt-0.5 text-[var(--text-3)]" />
          <p className="text-sm text-[var(--text-3)]">
            {t("cardExpenseBreakdownDescription")}
          </p>
        </div>
        {loading ? (
          <ChartSkeleton />
        ) : cardError ? (
          <p role="alert" className="py-6 text-sm text-[var(--rose)]">
            {cardError}
          </p>
        ) : !cardIntegrityValid ? (
          <p role="alert" className="py-6 text-sm text-[var(--rose)]">
            {t("cardMetricsIntegrityError")}
          </p>
        ) : !cardBreakdown?.groups.length ? (
          <p className="py-6 text-center text-sm text-[var(--text-3)]">
            {t("noDataRange")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cardBreakdown.groups.map((group) => {
              const primaryTotal = primaryCurrency
                ? group.totalsByCurrency.find(
                    (item) => item.currency === primaryCurrency,
                  )?.total ?? 0
                : 0;
              const percentage =
                primaryCurrency && cardCurrencyTotal > 0
                  ? (primaryTotal / cardCurrencyTotal) * 100
                  : null;
              return (
                <section
                  key={group.creditCardId ?? "no-card"}
                  className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-4"
                >
                  <h3 className="font-medium text-[var(--text-1)]">
                    {group.card
                      ? t("cardEnding", {
                          bank: group.card.bank,
                          name: group.card.name,
                          last4: group.card.last4,
                        })
                      : t("noCard")}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-3)]">
                    {t("expensesCount", {
                      count: formatNumber(group.expenseCount),
                    })}
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {group.totalsByCurrency.map((item) => (
                      <p
                        key={item.currency}
                        className="font-mono text-sm text-[var(--text-2)]"
                      >
                        {formatNumber(item.total, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {item.currency}
                      </p>
                    ))}
                  </div>
                  {percentage !== null && (
                    <p className="mt-3 text-xs text-[var(--text-3)]">
                      {t("currencySpendShare", {
                        percent: formatNumber(percentage, {
                          maximumFractionDigits: 1,
                        }),
                        currency: primaryCurrency ?? "",
                      })}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
