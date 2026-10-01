"use client";

import { useId, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import type { ReportGranularity } from "./reportMetrics";

export type ReportChartPoint = {
  key: string;
  /** Short axis label (e.g. "30 Aug"). */
  label: string;
  /** Unambiguous label used by tooltips and the accessible summary. */
  fullLabel: string;
  value: number;
  count: number;
};

const SPEND_KEY: Record<ReportGranularity, MessageKey> = {
  daily: "spendDaily",
  weekly: "spendWeekly",
  monthly: "spendMonthly",
  quarterly: "spendQuarterly",
};

const DISTRIBUTION_KEY: Record<ReportGranularity, MessageKey> = {
  daily: "distributionDaily",
  weekly: "distributionWeekly",
  monthly: "distributionMonthly",
  quarterly: "distributionQuarterly",
};

/** Smallest "round" axis maximum (1, 2, 2.5, 5 x 10^n) that fits the value. */
function niceMax(value: number) {
  if (!(value > 0)) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const frac = value / exp;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return nice * exp;
}

type ChartMode = "bars" | "line";

export function ReportSpendChart({
  points,
  currency,
  granularity,
  average,
}: {
  points: ReportChartPoint[];
  currency: string;
  granularity: ReportGranularity;
  average: number;
}) {
  const { t, formatNumber } = useLocale();
  const gradientId = useId();
  const [mode, setMode] = useState<ChartMode>("bars");

  const count = points.length;
  const peakValue = Math.max(0, ...points.map((point) => point.value));
  const peakIndex = peakValue > 0 ? points.findIndex((p) => p.value === peakValue) : -1;
  const axisMax = niceMax(Math.max(peakValue, average));
  const pctOf = (value: number) => Math.min(100, Math.max(0, (value / axisMax) * 100));
  const amount = (value: number) =>
    formatNumber(value, {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.abs(value) < 100 ? 2 : 0,
    });
  const money = (value: number) =>
    formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tickLabel = (value: number) =>
    formatNumber(value, {
      notation: value >= 10_000 ? "compact" : "standard",
      maximumFractionDigits: axisMax < 10 ? 1 : 0,
    });

  const ticks = [0, 1, 2, 3, 4].map((step) => (axisMax / 4) * step);
  const averagePct = pctOf(average);
  const gap = count <= 8 ? "gap-6" : count <= 16 ? "gap-3" : "gap-1";
  const labelStride = count <= 12 ? 1 : Math.ceil(count / 10);
  const dense = count > 16;
  const gridTemplateColumns = `repeat(${Math.max(1, count)}, minmax(0, 1fr))`;

  const summary = t("chartSummary", {
    title: t("spendingOverTime"),
    count: formatNumber(count),
    total: money(points.reduce((sum, point) => sum + point.value, 0)),
    currency,
    average: money(average),
    peak: money(peakValue),
    label: peakIndex >= 0 ? points[peakIndex].fullLabel : "—",
  });

  const linePath = points
    .map((point, index) => {
      const x = ((index + 0.5) / count) * 100;
      const y = 100 - pctOf(point.value);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const areaPath = `${linePath} L${(((count - 0.5) / count) * 100).toFixed(2)} 100 L${((0.5 / count) * 100).toFixed(2)} 100 Z`;

  return (
    <section className="relative rounded-2xl border border-[#18262E] bg-[#0D1418] p-6 shadow-[0_0_35px_-8px_rgba(16,185,129,0.15)]">
      <div className="flex flex-col justify-between gap-4 border-b border-[#18262E]/70 pb-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-bold tracking-tight text-white">
            {t("spendingOverTime")}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">{t(DISTRIBUTION_KEY[granularity])}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-emerald-600 to-teal-400"
              />
              <span className="text-slate-300">
                {t(SPEND_KEY[granularity])} ({currency})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-0 w-3.5 border-b border-dashed border-slate-300"
              />
              <span className="text-slate-400">
                {t("averageLegend", { amount: amount(average) })}
              </span>
            </div>
          </div>
          <div
            role="group"
            aria-label={t("chartViewType")}
            className="flex items-center rounded-lg border border-[#18262E] bg-[#060A0C] p-0.5 text-xs"
          >
            {(["bars", "line"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => setMode(option)}
                className={`cursor-pointer rounded px-2.5 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                  mode === option
                    ? "bg-[#1A262E] font-medium text-slate-200"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {t(option === "bars" ? "chartBars" : "chartLine")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div role="group" aria-label={summary} className="mt-8 flex">
        <div className="relative h-56 w-14 shrink-0 font-mono text-[10px] text-slate-600">
          {ticks.map((tick, index) => {
            const nearAverage = Math.abs(pctOf(tick) - averagePct) < 7;
            if (nearAverage && average > 0 && index !== 0) return null;
            return (
              <span
                key={tick}
                aria-hidden="true"
                className="absolute right-0 translate-y-1/2 pr-3 text-right"
                style={{ bottom: `${pctOf(tick)}%` }}
              >
                {tickLabel(tick)}
              </span>
            );
          })}
          {average > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-0 translate-y-1/2 pr-3 text-right font-semibold text-emerald-400"
              style={{ bottom: `${averagePct}%` }}
            >
              {amount(average)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-56">
            {ticks.map((tick, index) => (
              <div
                key={tick}
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 h-0 border-t ${
                  index === 0 ? "border-[#18262E]" : "border-[#18262E]/60"
                }`}
                style={{ bottom: `${pctOf(tick)}%` }}
              />
            ))}
            {average > 0 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 h-0 border-t border-dashed border-emerald-500/40"
                style={{ bottom: `${averagePct}%` }}
              />
            )}

            {mode === "line" && count > 0 && (
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill={`url(#${gradientId})`} />
                <path
                  d={linePath}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}

            <div
              className={`relative z-10 grid h-full items-end ${gap} ${dense ? "" : "px-4"}`}
              style={{ gridTemplateColumns }}
            >
              {points.map((point, index) => {
                const pct = pctOf(point.value);
                const isPeak = index === peakIndex;
                const low = point.value < peakValue * 0.35;
                const gradient = isPeak
                  ? "from-emerald-600 via-emerald-500 to-teal-300"
                  : low
                    ? "from-emerald-700 via-emerald-600 to-teal-500"
                    : "from-emerald-600 via-emerald-500 to-teal-400";
                const description = t("chartTitle", {
                  label: point.fullLabel,
                  value: money(point.value),
                  currency,
                  count: formatNumber(point.count),
                  transactions: t(point.count === 1 ? "transactionWord" : "transactionsWord"),
                });
                return (
                  <div
                    key={point.key}
                    tabIndex={0}
                    role="img"
                    aria-label={description}
                    title={description}
                    className="group relative flex h-full cursor-pointer flex-col items-center justify-end rounded outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/60"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border border-emerald-500/40 bg-slate-900 px-2.5 py-1.5 text-center text-[11px] opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                      style={{ bottom: `calc(${pct}% + 12px)` }}
                    >
                      <span className="block text-[9px] font-semibold uppercase text-slate-400">
                        {point.fullLabel}
                      </span>
                      <span className="font-bold text-emerald-400">
                        {money(point.value)} {currency}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {t("opsCount", { count: formatNumber(point.count) })}
                      </span>
                    </div>
                    {mode === "bars" ? (
                      <div
                        aria-hidden="true"
                        className={`w-full max-w-[70px] bg-gradient-to-t shadow-lg shadow-emerald-950/40 transition-all duration-300 group-hover:brightness-125 ${
                          dense ? "rounded-t-md" : "rounded-t-xl"
                        } ${gradient}`}
                        style={{
                          height: point.value > 0 ? `max(${pct}%, 2px)` : "0px",
                        }}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-[#0D1418] transition-transform group-hover:scale-150 ${
                          isPeak ? "bg-teal-300" : "bg-emerald-400"
                        }`}
                        style={{ bottom: `${pct}%` }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            aria-hidden="true"
            className={`mt-3 grid min-h-9 ${gap} ${dense ? "" : "px-4"}`}
            style={{ gridTemplateColumns }}
          >
            {points.map((point, index) => {
              const isPeak = index === peakIndex;
              const show = index % labelStride === 0 || isPeak;
              return (
                <div key={point.key} className="flex min-w-0 flex-col items-center text-center">
                  {show && (
                    <>
                      <span className="whitespace-nowrap text-xs font-semibold text-slate-300">
                        {point.label}
                      </span>
                      <span
                        className={`whitespace-nowrap text-[10px] ${
                          isPeak ? "font-semibold text-emerald-400" : "text-slate-500"
                        }`}
                      >
                        {t("opsCount", { count: formatNumber(point.count) })}
                        {isPeak ? ` ${t("peakTag")}` : ""}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
