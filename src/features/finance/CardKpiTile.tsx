import type { ReactNode } from "react";

export type KpiAccent = "teal" | "amber" | "rose" | "indigo";

// Static class strings so Tailwind can see every utility.
const CHIP_CLASS: Record<KpiAccent, string> = {
  teal: "border-teal-500/20 bg-teal-500/10 text-teal-400",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  rose: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-400",
};

const UNIT_CLASS: Record<KpiAccent, string> = {
  teal: "text-teal-400",
  amber: "text-amber-400",
  rose: "text-rose-400",
  indigo: "text-indigo-400",
};

const ICON_PATH: Record<KpiAccent, string> = {
  teal: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  amber: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  rose: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  indigo: "M13 10V3L4 14h7v7l9-11h-7z",
};

/**
 * KPI tile of the cards page. Local to this page on purpose: the shared
 * StatCard keeps the app theme for every other screen.
 */
export function CardKpiTile({
  accent,
  label,
  value,
  unit,
  size = "md",
  aside,
  children,
}: {
  accent: KpiAccent;
  label: string;
  value: string;
  /** Currency code rendered before the value, tinted with the accent colour. */
  unit?: string;
  size?: "md" | "lg";
  /** Inline text right after the value (large tiles). */
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#111A2C] to-[#0D1424] p-5 transition hover:border-slate-700/80">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <span aria-hidden="true" className={`shrink-0 rounded-xl border p-2 ${CHIP_CLASS[accent]}`}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d={ICON_PATH[accent]} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </span>
      </div>
      <div className={`mt-3 flex items-baseline ${size === "lg" ? "gap-2" : "gap-1"}`}>
        {unit && <span className={`text-xs font-normal ${UNIT_CLASS[accent]}`}>{unit}</span>}
        <span
          className={`font-mono font-bold text-white ${size === "lg" ? "text-3xl" : "text-2xl tracking-tight"}`}
        >
          {value}
        </span>
        {aside}
      </div>
      {children}
    </div>
  );
}
