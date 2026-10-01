"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { sparklineSamples } from "@/components/ui/TrendBadge";

export type ReportKpiAccent = "emerald" | "amber" | "teal" | "purple";
export type TrendDirection = "up" | "down" | "flat";

// Static class strings so Tailwind can see every utility.
const ICON_CLASS: Record<ReportKpiAccent, string> = {
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  teal: "border-teal-500/20 bg-teal-500/10 text-teal-400",
  purple: "border-purple-500/20 bg-purple-500/10 text-purple-400",
};

const ICON_PATH: Record<ReportKpiAccent, string> = {
  emerald:
    "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  amber:
    "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  teal: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
  purple: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
};

const CHIP_CLASS: Record<TrendDirection, string> = {
  // Spending went down: good news, green. Up: red. Flat: neutral.
  down: "border-emerald-800/40 bg-emerald-950/60 text-emerald-400",
  up: "border-rose-800/40 bg-rose-950/60 text-rose-400",
  flat: "border-slate-700/60 bg-slate-800/60 text-slate-300",
};

const ARROW: Record<TrendDirection, string> = { down: "▼", up: "▲", flat: "•" };

/** Percentage change chip: green ▼ when it decreased, red ▲ when it increased. */
export function ReportTrendChip({
  direction,
  pct,
}: {
  direction: TrendDirection;
  pct: number;
}) {
  const { formatNumber } = useLocale();
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums ${CHIP_CLASS[direction]}`}
    >
      <span aria-hidden="true">{ARROW[direction]}</span>
      {formatNumber(Math.abs(pct) / 100, {
        style: "percent",
        maximumFractionDigits: 1,
      })}
    </span>
  );
}

const SPARK_W = 100;
const SPARK_H = 35;

/** Smooth sparkline (line + faint area) drawn from the bucket series. */
export function ReportSparkline({
  values,
  tone,
}: {
  values: number[];
  tone: "emerald" | "rose";
}) {
  const samples = sparklineSamples(values, 24);
  const colorClass = tone === "rose" ? "text-rose-400" : "text-emerald-400";
  const flat = samples.length < 2 || samples.every((v) => v === samples[0]);
  let line: string;
  if (flat) {
    line = `M0 ${SPARK_H / 2} L${SPARK_W} ${SPARK_H / 2}`;
  } else {
    const max = Math.max(...samples);
    const min = Math.min(...samples);
    const range = max - min || 1;
    const pts = samples.map((v, i) => ({
      x: (i / (samples.length - 1)) * SPARK_W,
      y: SPARK_H - 4 - ((v - min) / range) * (SPARK_H - 8),
    }));
    line = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i += 1) {
      const mid = (pts[i - 1].x + pts[i].x) / 2;
      line += ` C${mid.toFixed(1)} ${pts[i - 1].y.toFixed(1)}, ${mid.toFixed(1)} ${pts[i].y.toFixed(1)}, ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }
  }
  return (
    <svg
      aria-hidden="true"
      className={`h-7 w-20 shrink-0 ${colorClass}`}
      fill="none"
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
    >
      <path
        d={line}
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      {!flat && (
        <path
          d={`${line} L${SPARK_W} ${SPARK_H} L0 ${SPARK_H} Z`}
          fill="currentColor"
          fillOpacity={0.08}
        />
      )}
    </svg>
  );
}

/**
 * KPI tile of the reports page. Local to this page on purpose: the shared
 * StatCard keeps the app theme for every other screen.
 */
export function ReportKpiTile({
  accent,
  label,
  chip,
  unit,
  value,
  suffix,
  right,
  footer,
}: {
  accent: ReportKpiAccent;
  label: string;
  chip?: ReactNode;
  /** Currency code rendered before the value. */
  unit?: string;
  value: string;
  /** Small text right after the value (e.g. "operations"). */
  suffix?: string;
  /** Right side of the value row: sparkline or name chip. */
  right?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#18262E] bg-[#0D1418] p-5 transition-all duration-300 hover:border-[#243742]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${ICON_CLASS[accent]}`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d={ICON_PATH[accent]}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </span>
        </div>
        {chip}
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          {unit && (
            <span className="mr-1.5 text-xs font-semibold text-slate-500">{unit}</span>
          )}
          <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
          {suffix && (
            <span className="ml-1.5 text-xs font-normal text-slate-400">{suffix}</span>
          )}
        </div>
        {right}
      </div>
      <div className="mt-2 flex min-h-4 items-center gap-1 text-[11px] text-slate-500">
        {footer}
      </div>
    </div>
  );
}

export function ReportKpiSkeleton({ count = 4 }: { count?: number }) {
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <span className="sr-only" role="status" aria-live="polite">
        {t("loadingSummary")}
      </span>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="rounded-2xl border border-[#18262E] bg-[#0D1418] p-5"
        >
          <div className="h-8 w-32 animate-pulse rounded-lg bg-[#121C22] motion-reduce:animate-none" />
          <div className="mt-4 h-7 w-36 animate-pulse rounded-lg bg-[#121C22] motion-reduce:animate-none" />
          <div className="mt-3 h-3 w-28 animate-pulse rounded-lg bg-[#121C22] motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}
