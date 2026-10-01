"use client";

import { DatePicker } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Delta } from "@/components/ui/TrendBadge";
import {
  getCardExpenseBreakdownAction,
  getExpensesAction,
  getUserMeAction,
} from "@/lib/userActions";
import type {
  CardExpenseBreakdownGroup,
  CardExpenseBreakdownResponse,
  Expense,
} from "./finance.types";
import {
  buildReportBuckets,
  getEffectiveRangeEnd,
  getPreviousRange,
  getQuarter,
  isCardBreakdownReconciled,
  MAX_REPORT_PAGES,
  resolvePrimaryCurrency,
  type ReportGranularity,
} from "./reportMetrics";
import { useLocale } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import { frontendError } from "@/i18n/errors";
import {
  ReportKpiSkeleton,
  ReportKpiTile,
  ReportSparkline,
  ReportTrendChip,
} from "./ReportKpiTile";
import { ReportSpendChart, type ReportChartPoint } from "./ReportSpendChart";
import { cardDisplayName, ReportCardTile } from "./ReportCardTile";
import {
  ReportCategoriesPanel,
  ReportDiagnosisPanel,
  type CategoryTrend,
} from "./ReportCategoriesPanel";
import { aggregateCategories } from "./reportInsights";
import {
  buildReportCsv,
  downloadCsv,
  reportCsvFilename,
} from "./reportExport";

type ExpenseRangeResult = {
  expenses: Expense[];
  complete: boolean;
  error?: string;
};

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

type ReportData = {
  key: string;
  expenses: Expense[];
  previousExpenses: Expense[];
  configuredCurrency?: string;
  cardBreakdown?: CardExpenseBreakdownResponse;
  currentComplete: boolean;
  comparisonComplete: boolean;
  comparisonAvailable: boolean;
  error?: string;
  cardError?: string;
};

const EMPTY_REPORT_DATA: ReportData = {
  key: "",
  expenses: [],
  previousExpenses: [],
  currentComplete: false,
  comparisonComplete: false,
  comparisonAvailable: false,
};

const AVERAGE_KEY: Record<ReportGranularity, MessageKey> = {
  daily: "averageDaily",
  weekly: "averageWeekly",
  monthly: "averageMonthly",
  quarterly: "averageQuarterly",
};

const GRANULARITY_OPTIONS: { key: MessageKey; value: ReportGranularity }[] = [
  { key: "daily", value: "daily" },
  { key: "weekly", value: "weekly" },
  { key: "monthly", value: "monthly" },
  { key: "quarterly", value: "quarterly" },
];

const SURFACE = "border border-[#18262E] bg-[#0D1418]";

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl p-6 ${SURFACE}`}>
      <h2 className="text-base font-bold tracking-tight text-white">{title}</h2>
      <div className="py-8 text-center text-sm text-slate-400">{children}</div>
    </section>
  );
}

function CardIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0 text-slate-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <rect height="14" rx="2" strokeLinecap="round" width="20" x="2" y="5" />
      <line strokeLinecap="round" x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
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
  const [compare, setCompare] = useState(true);
  const [data, setData] = useState<ReportData>();
  const [dismissedErrorKey, setDismissedErrorKey] = useState<string>();

  const effectiveEnd = useMemo(
    () => getEffectiveRangeEnd(range[1]),
    [range],
  );
  const previousRange = useMemo(
    () => getPreviousRange(range[0], effectiveEnd),
    [effectiveEnd, range],
  );
  // Data is stamped with the request it belongs to; anything stamped with an
  // older key is "loading" without resetting state inside the effect.
  const requestKey = `${range[0].valueOf()}|${effectiveEnd.valueOf()}|${compare}`;
  const loading = data?.key !== requestKey;
  const current = !loading && data ? data : EMPTY_REPORT_DATA;
  const {
    expenses,
    previousExpenses,
    configuredCurrency,
    cardBreakdown,
    currentComplete,
    comparisonComplete,
    comparisonAvailable,
    cardError,
  } = current;
  const error = current.error && dismissedErrorKey !== requestKey ? current.error : undefined;

  useEffect(() => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    const key = requestKey;

    void (async () => {
      const profile = await getUserMeAction();
      if (sequence !== requestSequence.current) return;
      if (profile.error || !profile.data?.user?.isActive) {
        router.push("/user-login");
        return;
      }

      const result: ReportData = {
        ...EMPTY_REPORT_DATA,
        key,
        configuredCurrency: profile.data.user.currency,
      };
      if (range[0].startOf("day").isAfter(effectiveEnd.startOf("day"))) {
        setData(result);
        return;
      }

      const cardQuery = new URLSearchParams({
        from: range[0].format("YYYY-MM-DD"),
        to: effectiveEnd.format("YYYY-MM-DD"),
      });
      const [currentResult, previousResult, cardResult] = await Promise.all([
        fetchExpensesInRange(range[0], effectiveEnd),
        // The preceding range is only fetched while the comparison is on.
        compare
          ? fetchExpensesInRange(previousRange[0], previousRange[1])
          : Promise.resolve(undefined),
        getCardExpenseBreakdownAction(cardQuery.toString()),
      ]);
      if (sequence !== requestSequence.current) return;

      if (currentResult.error) {
        result.error = frontendError(
          currentResult.error,
          t,
          "requestFailedGeneric",
        );
      } else {
        result.expenses = currentResult.expenses;
        result.currentComplete = currentResult.complete;
      }

      if (previousResult && !previousResult.error) {
        result.previousExpenses = previousResult.expenses;
        result.comparisonAvailable = true;
        result.comparisonComplete = previousResult.complete;
      }

      if (cardResult.error || !cardResult.data) {
        result.cardError = frontendError(
          cardResult.error,
          t,
          "requestFailedGeneric",
        );
      } else {
        result.cardBreakdown = cardResult.data;
      }
      setData(result);
    })();
  }, [compare, effectiveEnd, previousRange, range, requestKey, router, t]);

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
  const dataReady = !loading && reportComplete && Boolean(primaryCurrency);
  // The comparison only means something when the previous range has data.
  const showComparison =
    dataReady && comparisonAvailable && previousTransactionCount > 0;
  const comparisonRequested = compare && dataReady;
  const cardCurrencyTotal =
    cardBreakdown?.currencyBreakdown.find(
      (item) => item.currency === primaryCurrency,
    )?.total ?? 0;
  const groupPrimaryTotal = (group: CardExpenseBreakdownGroup) =>
    group.totalsByCurrency.find((item) => item.currency === primaryCurrency)
      ?.total ?? 0;
  let topGroup: CardExpenseBreakdownGroup | null = null;
  if (cardBreakdown && cardIntegrityValid && primaryCurrency) {
    let bestTotal = 0;
    for (const group of cardBreakdown.groups) {
      if (!group.card) continue;
      const total = groupPrimaryTotal(group);
      if (total > bestTotal) {
        bestTotal = total;
        topGroup = group;
      }
    }
  }

  const money = (value: number) =>
    formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const withCurrency = (value: number) =>
    `${money(value)} ${primaryCurrency ?? ""}`.trim();
  const sparkTone = (delta: Delta) => (delta.direction === "up" ? "rose" : "emerald");
  const chipFor = (delta: Delta) =>
    showComparison && delta.pct !== null ? (
      <ReportTrendChip direction={delta.direction} pct={delta.pct} />
    ) : undefined;

  const shortLabel = (start: Dayjs) =>
    granularity === "quarterly"
      ? t("quarterLabel", {
          quarter: String(getQuarter(start)),
          year: String(start.year()),
        })
      : granularity === "monthly"
        ? formatDate(start.toDate(), { month: "short", year: "numeric" })
        : formatDate(start.toDate(), { day: "numeric", month: "short" });
  const fullLabel = (start: Dayjs) =>
    granularity === "quarterly" || granularity === "monthly"
      ? shortLabel(start)
      : formatDate(start.toDate(), {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  const chartPoints: ReportChartPoint[] = buckets.map((bucket, index) => ({
    key: bucket.key,
    label: shortLabel(bucket.start),
    fullLabel: fullLabel(bucket.start),
    value: bucketTotalsSeries[index],
    count: bucketCountsSeries[index],
  }));
  const peakBucketValue = Math.max(0, ...bucketTotalsSeries);
  const rangeDays =
    effectiveEnd.startOf("day").diff(range[0].startOf("day"), "day") + 1;
  const categoryTotals = aggregateCategories(expenses, primaryCurrency);
  const previousCategoryTotals = new Map(
    aggregateCategories(previousExpenses, primaryCurrency).map((item) => [
      item.id ?? "none",
      item.total,
    ]),
  );
  const categoryTrends: Record<string, CategoryTrend | undefined> = {};
  if (showComparison) {
    for (const item of categoryTotals) {
      const key = item.id ?? "none";
      const previous = previousCategoryTotals.get(key) ?? 0;
      const delta = computeDelta(item.total, previous);
      if (previous > 0 && delta.pct !== null) {
        categoryTrends[key] = { direction: delta.direction, pct: delta.pct };
      }
    }
  }
  const pctText = (value: number) =>
    formatNumber(value, { maximumFractionDigits: 1 });

  // Deterministic rules over real data; at most four bullets, in this order.
  const insights: string[] = [];
  if (dataReady && grandTotal > 0) {
    if (showComparison && totalSpentDelta.pct !== null) {
      insights.push(
        totalSpentDelta.direction === "flat"
          ? t("insightSpendFlat")
          : t(
              totalSpentDelta.direction === "down"
                ? "insightSpendFell"
                : "insightSpendRose",
              { percent: pctText(Math.abs(totalSpentDelta.pct)) },
            ),
      );
    }
    const peakIdx = peakBucketValue > 0 ? bucketTotalsSeries.indexOf(peakBucketValue) : -1;
    if (peakIdx >= 0) {
      insights.push(
        t("insightPeak", {
          label: chartPoints[peakIdx].fullLabel,
          amount: withCurrency(peakBucketValue),
          count: formatNumber(chartPoints[peakIdx].count),
        }),
      );
    }
    const topCategory = categoryTotals.find((item) => item.category);
    if (topCategory) {
      insights.push(
        t("insightTopCategory", {
          name: topCategory.category?.name ?? "",
          percent: pctText((topCategory.total / grandTotal) * 100),
        }),
      );
    }
    if (topGroup?.card && cardCurrencyTotal > 0) {
      insights.push(
        t("insightTopCard", {
          name: cardDisplayName(topGroup.card),
          percent: pctText((groupPrimaryTotal(topGroup) / cardCurrencyTotal) * 100),
        }),
      );
    }
    const noCardGroup =
      cardBreakdown && cardIntegrityValid
        ? cardBreakdown.groups.find((group) => !group.card)
        : undefined;
    const noCardShare =
      noCardGroup && cardCurrencyTotal > 0
        ? (groupPrimaryTotal(noCardGroup) / cardCurrencyTotal) * 100
        : 0;
    const noCategory = categoryTotals.find((item) => !item.category);
    const noCategoryShare = noCategory ? (noCategory.total / grandTotal) * 100 : 0;
    if (noCardShare >= 1 || noCategoryShare >= 1) {
      insights.push(
        noCardShare >= noCategoryShare
          ? t("insightNoCard", { percent: pctText(noCardShare) })
          : t("insightNoCategory", { percent: pctText(noCategoryShare) }),
      );
    }
  }
  const visibleInsights = insights.slice(0, 4);
  const exportReady =
    dataReady && expenses.length > 0 && buckets.length > 0 && !cardError;

  function handleExport() {
    if (!exportReady) return;
    const csv = buildReportCsv({
      labels: {
        period: t("csvPeriod"),
        currency: t("csvCurrency"),
        total: t("csvTotal"),
        operations: t("csvOperations"),
        card: t("csvCard"),
        category: t("csvCategories"),
        last4: t("csvLast4"),
        expenses: t("csvExpenses"),
      },
      buckets: buckets.map((bucket) => ({
        label: bucket.key,
        totalsByCurrency: bucket.totalsByCurrency,
        countsByCurrency: bucket.countsByCurrency,
      })),
      primaryCurrency,
      cards:
        cardBreakdown && cardIntegrityValid
          ? cardBreakdown.groups.map((group) => ({
              name: group.card ? cardDisplayName(group.card) : t("noCard"),
              last4: group.card?.last4 ?? "",
              expenseCount: group.expenseCount,
              totalsByCurrency: group.totalsByCurrency,
            }))
          : [],
      categories: currencies.flatMap((currency) =>
        aggregateCategories(expenses, currency).map((item) => ({
          name: item.category?.name ?? t("uncategorized"),
          currency,
          total: item.total,
          count: item.count,
        })),
      ),
    });
    downloadCsv(
      csv,
      reportCsvFilename(
        range[0].format("YYYY-MM-DD"),
        effectiveEnd.format("YYYY-MM-DD"),
      ),
    );
  }

  return (
    // Full-bleed #080C0E backdrop for this page only: the box-shadow spreads the
    // colour sideways past the max-w column, clip-path trims it vertically.
    <div className="mx-auto min-h-full w-full max-w-7xl space-y-7 bg-[#080C0E] p-4 shadow-[0_0_0_100vmax_#080C0E] [clip-path:inset(0_-100vmax)] sm:p-6">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t("spendingReports")}
          </h1>
          <p className="mt-1 text-xs text-slate-400">{t("reportsDescription")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <DatePicker.RangePicker
            aria-label={t("reportDateRange")}
            value={range}
            allowClear={false}
            separator={<span className="text-slate-500">→</span>}
            suffixIcon={<CalendarOutlined className="!text-emerald-400" />}
            className="!rounded-xl !border-[#18262E] !bg-[#0D1418] !px-3 !py-1.5 hover:!border-[#243742] [&_input]:!text-xs [&_input]:!font-medium [&_input]:!tracking-wide [&_input]:!text-slate-200"
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
          <div
            role="group"
            aria-label={t("bucketGranularity")}
            className={`flex items-center rounded-xl p-1 text-xs font-medium ${SURFACE}`}
          >
            {GRANULARITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={granularity === option.value}
                onClick={() => setGranularity(option.value)}
                className={`cursor-pointer rounded-lg px-3 py-1 transition-all focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                  granularity === option.value
                    ? "border border-emerald-500/20 bg-[#18262E] font-semibold text-emerald-400 shadow-sm"
                    : "border border-transparent text-slate-400 hover:text-white"
                }`}
              >
                {t(option.key)}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={compare}
            onClick={() => setCompare((value) => !value)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-400 ${
              compare
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-[#18262E] bg-[#0D1418] text-slate-300 hover:bg-[#18262E]/50"
            }`}
          >
            <svg
              aria-hidden="true"
              className={`h-3.5 w-3.5 ${compare ? "text-emerald-400" : "text-slate-400"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <span>{t("compareWithPrevious")}</span>
          </button>
          <button
            type="button"
            disabled={!exportReady}
            onClick={handleExport}
            title={exportReady ? undefined : t("exportReportUnavailable")}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-black shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-500"
          >
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
              />
            </svg>
            <span>{t("exportReport")}</span>
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setDismissedErrorKey(requestKey)}
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
          className="rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-3 text-sm text-slate-300"
        >
          {t("reportIncompleteData")}
        </div>
      )}

      {loading ? (
        <ReportKpiSkeleton count={4} />
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ReportKpiTile
            accent="emerald"
            label={t("totalSpent")}
            chip={chipFor(totalSpentDelta)}
            unit={dataReady ? primaryCurrency ?? undefined : undefined}
            value={dataReady ? money(grandTotal) : "—"}
            right={
              dataReady ? (
                <ReportSparkline
                  values={bucketTotalsSeries}
                  tone={showComparison ? sparkTone(totalSpentDelta) : "emerald"}
                />
              ) : undefined
            }
            footer={
              !dataReady ? undefined : showComparison ? (
                <>
                  <span>{t("previousPeriodAmount")}</span>
                  <span className="font-medium text-slate-400">
                    {withCurrency(previousGrandTotal)}
                  </span>
                </>
              ) : comparisonRequested ? (
                <span>{t("noPreviousPeriodData")}</span>
              ) : (
                <span>{t("rangeDays", { count: formatNumber(rangeDays) })}</span>
              )
            }
          />
          <ReportKpiTile
            accent="amber"
            label={t(AVERAGE_KEY[granularity])}
            chip={chipFor(averageDelta)}
            unit={dataReady ? primaryCurrency ?? undefined : undefined}
            value={dataReady ? money(averagePerBucket) : "—"}
            right={
              dataReady ? (
                <ReportSparkline
                  values={bucketTotalsSeries}
                  tone={showComparison ? sparkTone(averageDelta) : "emerald"}
                />
              ) : undefined
            }
            footer={
              !dataReady ? undefined : showComparison ? (
                <>
                  <span>{t("previousPeriodAmount")}</span>
                  <span className="font-medium text-slate-400">
                    {withCurrency(previousAveragePerBucket)}
                  </span>
                </>
              ) : (
                <>
                  <span>{t("peakAmount")}</span>
                  <span className="font-medium text-slate-400">
                    {withCurrency(peakBucketValue)}
                  </span>
                </>
              )
            }
          />
          <ReportKpiTile
            accent="teal"
            label={t("transactions")}
            chip={chipFor(transactionsDelta)}
            value={dataReady ? formatNumber(transactionCount) : "—"}
            suffix={dataReady ? t("reportOperations") : undefined}
            right={
              dataReady ? (
                <ReportSparkline
                  values={bucketCountsSeries}
                  tone={showComparison ? sparkTone(transactionsDelta) : "emerald"}
                />
              ) : undefined
            }
            footer={
              dataReady && transactionCount > 0 ? (
                <>
                  <span>{t("averageTicket")}</span>
                  <span className="font-medium text-slate-400">
                    {withCurrency(grandTotal / transactionCount)}
                  </span>
                </>
              ) : undefined
            }
          />
          <ReportKpiTile
            accent="purple"
            label={t("topCard")}
            chip={
              topGroup && cardCurrencyTotal > 0 ? (
                <span className="inline-flex shrink-0 items-center rounded-full border border-purple-800/40 bg-purple-950/70 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                  {t("shareOfTotal", {
                    percent: formatNumber(
                      (groupPrimaryTotal(topGroup) / cardCurrencyTotal) * 100,
                      { maximumFractionDigits: 1 },
                    ),
                  })}
                </span>
              ) : undefined
            }
            unit={topGroup ? primaryCurrency ?? undefined : undefined}
            value={topGroup ? money(groupPrimaryTotal(topGroup)) : "—"}
            right={
              topGroup?.card ? (
                <span className="max-w-[55%] truncate rounded bg-purple-500/10 px-2 py-1 text-xs font-bold text-purple-400">
                  {cardDisplayName(topGroup.card)}
                </span>
              ) : undefined
            }
            footer={
              topGroup ? (
                <span>
                  {t("recordedMovements", {
                    count: formatNumber(topGroup.expenseCount),
                  })}
                </span>
              ) : dataReady ? (
                <span>{t("noLinkedCardSpend")}</span>
              ) : undefined
            }
          />
        </section>
      )}

      {!loading && reportComplete && !primaryCurrency && expenses.length > 0 && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-sm text-slate-300 ${SURFACE}`}
        >
          {t("reportPrimaryCurrencyUnavailable")}
        </div>
      )}

      {!loading && reportComplete && currencies.length > 1 && (
        <div className={`rounded-2xl p-4 ${SURFACE}`}>
          <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">
            {t("otherCurrencies")}
          </p>
          <div className="flex flex-wrap gap-4">
            {currencies
              .filter((currency) => currency !== primaryCurrency)
              .map((currency) => (
                <span
                  key={currency}
                  className="font-mono text-sm text-slate-300"
                >
                  {money(currencyTotals[currency])} {currency}
                </span>
              ))}
          </div>
        </div>
      )}

      {loading ? (
        <ReportSection title={t("spendingOverTime")}>
          <div
            aria-hidden="true"
            className="h-56 animate-pulse rounded-xl bg-[#121C22] motion-reduce:animate-none"
          />
        </ReportSection>
      ) : !reportComplete ? (
        <ReportSection title={t("spendingOverTime")}>
          {t("reportIncompleteData")}
        </ReportSection>
      ) : expenses.length === 0 ? (
        <ReportSection title={t("spendingOverTime")}>
          {t("noDataRange")}
        </ReportSection>
      ) : !primaryCurrency ? (
        <ReportSection title={t("spendingOverTime")}>
          {t("reportPrimaryCurrencyUnavailable")}
        </ReportSection>
      ) : (
        <ReportSpendChart
          points={chartPoints}
          currency={primaryCurrency}
          granularity={granularity}
          average={averagePerBucket}
        />
      )}

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold tracking-tight text-white">
              {t("cardExpenseBreakdown")}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <CardIcon />
              {t("cardExpenseBreakdownDescription")}
            </p>
          </div>
          <Link
            href="/finance/cards"
            className="self-start text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300 sm:self-auto"
          >
            {t("manageCards")}
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                aria-hidden="true"
                className="h-48 animate-pulse rounded-2xl border border-[#18262E] bg-[#0D1418] motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : cardError ? (
          <p role="alert" className="py-6 text-sm text-[var(--rose)]">
            {cardError}
          </p>
        ) : !cardIntegrityValid ? (
          <p role="alert" className="py-6 text-sm text-[var(--rose)]">
            {t("cardMetricsIntegrityError")}
          </p>
        ) : !cardBreakdown?.groups.length ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {t("noDataRange")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cardBreakdown.groups.map((group) => (
              <ReportCardTile
                key={group.creditCardId ?? "no-card"}
                group={group}
                primaryCurrency={primaryCurrency}
                sharePercent={
                  primaryCurrency && cardCurrencyTotal > 0
                    ? (groupPrimaryTotal(group) / cardCurrencyTotal) * 100
                    : null
                }
                isTop={
                  topGroup !== null &&
                  group.creditCardId === topGroup.creditCardId
                }
              />
            ))}
          </div>
        )}
      </section>

      {dataReady && categoryTotals.length > 0 && primaryCurrency && (
        <section className="grid grid-cols-1 gap-6 pb-6 pt-2 lg:grid-cols-3">
          <ReportCategoriesPanel
            items={categoryTotals}
            grandTotal={grandTotal}
            currency={primaryCurrency}
            trends={categoryTrends}
          />
          <ReportDiagnosisPanel insights={visibleInsights} />
        </section>
      )}
    </div>
  );
}
