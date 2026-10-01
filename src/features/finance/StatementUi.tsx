"use client";

// Visual primitives local to the statements module (list + detail). They mirror
// the palette of the redesigned cards page (CardKpiTile / CreditCardTile) without
// touching the shared Card, Badge, Button or CreditCardPicker defaults.

import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Full-bleed #080C14 backdrop (same shadow / clip-path trick as the cards page). */
export const STATEMENT_BACKDROP_CLASS =
  "mx-auto min-h-full w-full bg-[#080C14] shadow-[0_0_0_100vmax_#080C14] [clip-path:inset(0_-100vmax)]";

/**
 * Scoped restyle of antd fields (inputs, selects, number inputs, table) so they
 * sit on the dark navy surfaces. Applied on the view wrapper only.
 */
export const STATEMENT_FIELD_SCOPE = [
  "[&_.ant-input]:!border-slate-800 [&_.ant-input]:!bg-[#0A0F19] [&_.ant-input]:!text-slate-200",
  "[&_.ant-input-affix-wrapper]:!border-slate-800 [&_.ant-input-affix-wrapper]:!bg-[#0A0F19]",
  "[&_.ant-input-number]:!border-slate-800 [&_.ant-input-number]:!bg-[#0A0F19]",
  "[&_.ant-input-number-input]:!text-slate-200",
  "[&_.ant-select]:!border-slate-800 [&_.ant-select]:!bg-[#0A0F19] [&_.ant-select-selector]:!bg-transparent",
  "[&_.ant-input:focus]:!border-emerald-500/60 [&_.ant-input-focused]:!border-emerald-500/60",
  "[&_.ant-input-number-focused]:!border-emerald-500/60 [&_.ant-select-focused]:!border-emerald-500/60",
  "[&_.ant-input[disabled]]:!opacity-70",
  "[&_.animate-pulse]:!bg-slate-800/80",
].join(" ");

// Variables read by the shared CreditCardPicker (empty message, focus ring,
// selected ring). Redefining them in a wrapper re-tones it without editing it.
export const STATEMENT_PICKER_SCOPE =
  "[--emerald:#10b981] [--emerald-dim:rgba(16,185,129,0.1)] [--emerald-text:#34d399] [--border-soft:rgba(30,41,59,0.9)] [--border:#334155] [--text-2:#cbd5e1] [--text-3:#94a3b8] [--bg-1:#080C14]";

export type StatementTone = "emerald" | "amber" | "rose" | "sky" | "slate" | "indigo" | "teal";

const BADGE_CLASS: Record<StatementTone, string> = {
  emerald: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  amber: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  rose: "border-rose-500/30 bg-rose-500/15 text-rose-400",
  sky: "border-sky-500/30 bg-sky-500/15 text-sky-400",
  slate: "border-slate-700 bg-slate-800 text-slate-300",
  indigo: "border-indigo-500/30 bg-indigo-500/15 text-indigo-400",
  teal: "border-teal-500/30 bg-teal-500/15 text-teal-400",
};

const DOT_CLASS: Record<StatementTone, string> = {
  emerald: "bg-emerald-400",
  amber: "bg-amber-400 motion-safe:animate-pulse",
  rose: "bg-rose-400",
  sky: "bg-sky-400",
  slate: "bg-slate-400",
  indigo: "bg-indigo-400",
  teal: "bg-teal-400",
};

/** Status pill with a dot, same shape as the "Pagado / Pendiente" badges of the cards page. */
export function StatementBadge({
  tone,
  dot = true,
  className = "",
  children,
}: {
  tone: StatementTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${BADGE_CLASS[tone]} ${className}`}
    >
      {dot && <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[tone]}`} />}
      {children}
    </span>
  );
}

/** Square-ish count chip (replaces Badge ring). */
export function StatementCountChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
      {children}
    </span>
  );
}

/** Dark navy section card (same gradient surface as CardKpiTile). */
export function StatementSectionCard({
  title,
  aside,
  className = "",
  bodyClassName = "",
  children,
}: {
  title?: string;
  aside?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#111A2C] to-[#0D1424] ${className}`}
    >
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 px-5 py-4">
          <h2 className="text-sm font-bold tracking-tight text-white">{title}</h2>
          {aside}
        </div>
      )}
      <div className={bodyClassName || "p-5"}>{children}</div>
    </section>
  );
}

export type StatementAccent = "teal" | "amber" | "rose" | "indigo" | "emerald" | "slate";

const CHIP_CLASS: Record<StatementAccent, string> = {
  teal: "border-teal-500/20 bg-teal-500/10 text-teal-400",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  rose: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-400",
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  slate: "border-slate-700 bg-slate-800 text-slate-400",
};

const ICON_PATH: Record<StatementAccent, string> = {
  teal: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  amber: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  rose: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  indigo: "M13 10V3L4 14h7v7l9-11h-7z",
  emerald: "M5 13l4 4L19 7",
  slate: "M4 6h16M4 12h16M4 18h16",
};

/** Compact KPI / reconciliation tile: label + icon chip on top, mono value below. */
export function StatementTile({
  accent,
  label,
  value,
  valueClassName = "text-white",
  surfaceClassName = "border-slate-800/80 bg-gradient-to-b from-[#111A2C] to-[#0D1424]",
}: {
  accent: StatementAccent;
  label: string;
  value: string;
  valueClassName?: string;
  surfaceClassName?: string;
}) {
  return (
    <div className={`rounded-2xl border p-3.5 transition hover:border-slate-700/80 sm:p-4 ${surfaceClassName}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <span aria-hidden="true" className={`shrink-0 rounded-lg border p-1.5 ${CHIP_CLASS[accent]}`}>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d={ICON_PATH[accent]} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </span>
      </div>
      <p className={`mt-2.5 break-words font-mono text-sm font-bold sm:text-base ${valueClassName}`}>{value}</p>
    </div>
  );
}

export type StatementButtonVariant = "primary" | "pay" | "secondary" | "danger" | "ghost" | "tint";

const BUTTON_BASE =
  "inline-flex cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-semibold transition focus-visible:outline-2 focus-visible:outline-emerald-400 active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none";

const BUTTON_VARIANT: Record<StatementButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400",
  pay: "bg-gradient-to-r from-cyan-600 to-sky-600 font-bold text-white shadow-sm hover:from-cyan-500 hover:to-sky-500 focus-visible:outline-sky-400",
  secondary: "bg-slate-800/90 text-slate-200 hover:bg-slate-700",
  danger: "border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 focus-visible:outline-rose-400",
  ghost: "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200",
  tint: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
};

const BUTTON_SIZE = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
} as const;

/** Local button with the cards-page look; same props contract as the shared Button (incl. loading). */
export function StatementButton({
  variant = "secondary",
  size = "sm",
  loading = false,
  className = "",
  disabled,
  children,
  type = "button",
  ...rest
}: {
  variant?: StatementButtonVariant;
  size?: keyof typeof BUTTON_SIZE;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${className}`}
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || rest["aria-busy"]}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin motion-reduce:animate-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
        </svg>
      )}
      {children}
    </button>
  );
}

/** Banners (error / success notice) in the rose / emerald palette. */
export const STATEMENT_ERROR_BANNER_CLASS =
  "rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300";
export const STATEMENT_NOTICE_BANNER_CLASS =
  "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300";
export const STATEMENT_WARNING_BANNER_CLASS =
  "rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-300";

/** Maps the shared BadgeVariant of STATUS_META onto the cards-page badge tones. */
export function toneFromVariant(variant: "neutral" | "success" | "warning" | "danger" | "info"): StatementTone {
  switch (variant) {
    case "success": return "emerald";
    case "warning": return "amber";
    case "danger": return "rose";
    case "info": return "sky";
    default: return "slate";
  }
}

export function paymentStatusTone(status: string): StatementTone {
  return status === "PAID" ? "emerald" : "amber";
}
