"use client";

import { Badge } from "./Badge";
import { useLocale } from "@/i18n/LocaleProvider";

export type Delta = {
  pct: number | null;
  direction: "up" | "down" | "flat";
};

export function TrendBadge({ delta }: { delta: Delta }) {
  const { t, formatNumber } = useLocale();
  const variant = delta.direction === "flat" ? "neutral" : delta.direction === "down" ? "success" : "danger";
  const arrow = delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "•";
  const label = delta.pct === null ? t("newTrend") : formatNumber(Math.abs(delta.pct) / 100, { style: "percent", maximumFractionDigits: 1 });

  return (
    <Badge variant={variant} className="items-center gap-1 !px-2 !py-0.5 text-[10.5px] tabular-nums">
      <span aria-hidden="true">{arrow}</span>
      {label}
    </Badge>
  );
}

export function sparklineSamples(values: number[], maxPoints = 15): number[] {
  if (values.length <= maxPoints) return values;
  const step = values.length / maxPoints;
  return Array.from({ length: maxPoints }, (_, i) => values[Math.floor(i * step)]);
}

export function Sparkline({ values, favorable }: { values: number[]; favorable: "up" | "down" | "flat" }) {
  const { t } = useLocale();
  const samples = sparklineSamples(values);
  const width = 72;
  const height = 24;
  const stroke = favorable === "down" ? "var(--emerald)" : favorable === "up" ? "var(--rose)" : "var(--text-3)";

  if (samples.length < 2 || samples.every((value) => value === samples[0])) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </svg>
    );
  }

  const max = Math.max(...samples);
  const min = Math.min(...samples);
  const range = max - min || 1;
  const points = samples
    .map((value, index) => {
      const x = (index / (samples.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("recentTrend")}>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
