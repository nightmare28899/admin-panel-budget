import type { ReactNode } from "react";
import { CloseOutlined } from "@ant-design/icons";
import { splitFormattedAmount } from "./auroraAmount";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

/** Localized amount with a dimmed decimal part and an optional small mono currency prefix. */
export function AuroraAmount({
  value,
  unit,
  className = "text-[30px]",
}: {
  value: string;
  unit?: string;
  className?: string;
}) {
  const { whole, decimals } = splitFormattedAmount(value);
  return (
    <span className="inline-flex items-baseline gap-1.5 font-[family-name:var(--theme-font-mono)] tabular-nums text-[var(--text-1)]">
      {unit && <span className="text-xs font-medium text-[var(--text-3)]">{unit}</span>}
      <span className={`font-semibold leading-none ${className}`}>
        {whole}
        {decimals && <span className="text-[0.62em] font-medium opacity-50">{decimals}</span>}
      </span>
    </span>
  );
}

export type AuroraKpiTone = "teal" | "violet";

const KPI_TONES: Record<AuroraKpiTone, { tile: string; tint: string; bar: string; pill: string }> = {
  teal: {
    tile: "bg-[var(--accent-dim)] text-[var(--accent-text)]",
    tint: "var(--accent)",
    bar: "bg-[var(--accent)]",
    pill: "bg-[var(--accent-dim)] text-[var(--accent-text)]",
  },
  violet: {
    tile: "bg-[var(--violet-dim)] text-[var(--violet-text)]",
    tint: "var(--violet)",
    bar: "bg-[var(--violet)]",
    pill: "bg-[var(--violet-dim)] text-[var(--violet-text)]",
  },
};

/** KPI card of the aurora theme: tinted icon tile, mono label, big amount, optional bar, footnote and CTA. */
export function AuroraKpiCard({
  tone,
  icon,
  label,
  sublabel,
  pill,
  amount,
  unit,
  progress,
  footnote,
  action,
  className = "",
}: {
  tone: AuroraKpiTone;
  icon: ReactNode;
  label: string;
  sublabel?: string;
  /** Small status pill on the top right (e.g. "62% used"). */
  pill?: string;
  amount: string;
  unit?: string;
  /** 0-100; clamped. Omit to hide the bar. */
  progress?: number;
  footnote?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const styles = KPI_TONES[tone];
  const percent = progress === undefined || !Number.isFinite(progress) ? undefined : Math.min(100, Math.max(0, progress));
  return (
    <div
      className={`relative flex flex-col gap-4 overflow-hidden rounded-[var(--radius-card)] border border-[var(--card-border)] p-5 [box-shadow:var(--card-shadow)] ${className}`}
      style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${styles.tint} 9%, transparent) 0%, transparent 70%), var(--bg-1)` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[18px] ${styles.tile}`}>{icon}</span>
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--theme-font-mono)] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-2)]">{label}</p>
            {sublabel && <p className="mt-0.5 truncate text-xs text-[var(--text-3)]">{sublabel}</p>}
          </div>
        </div>
        {pill && (
          <span className={`shrink-0 rounded-full px-2.5 py-1 font-[family-name:var(--theme-font-mono)] text-[10px] font-medium uppercase tracking-wider ${styles.pill}`}>
            {pill}
          </span>
        )}
      </div>
      <AuroraAmount value={amount} unit={unit} />
      {percent !== undefined && (
        <div role="presentation" className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-3)]">
          <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${percent}%` }} />
        </div>
      )}
      {(footnote || action) && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-3)]">
          {footnote && <div className="min-w-0">{footnote}</div>}
          {action}
        </div>
      )}
    </div>
  );
}

/** Page header: big display title with a pill, a subtitle with a status dot, and an action cluster. */
export function AuroraPageHeader({
  title,
  pill,
  subtitle,
  actions,
}: {
  title: string;
  pill?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-[family-name:var(--theme-font-display)] text-3xl font-bold tracking-tight text-[var(--text-1)] sm:text-4xl">{title}</h1>
          {pill && (
            <span className="rounded-full border border-[var(--accent)]/40 bg-[var(--accent-dim)] px-3 py-1 font-[family-name:var(--theme-font-mono)] text-[11px] font-medium uppercase tracking-wider text-[var(--accent-text)] first-letter:uppercase">
              {pill}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-2 flex items-center gap-2 text-sm text-[var(--text-3)]">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Row of single-select filter chips; the active chip gets an accent outline. */
export function AuroraFilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors motion-reduce:transition-none ${FOCUS_RING} ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent-text)]"
                : "border-[var(--border-soft)] text-[var(--text-3)] hover:border-[var(--border)] hover:text-[var(--text-1)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Inset surface holding the filter controls, with a square clear button. */
export function AuroraFilterBar({
  children,
  clearLabel,
  onClear,
}: {
  children: ReactNode;
  clearLabel: string;
  onClear: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--input-bg)] p-3">
      {children}
      <button
        type="button"
        onClick={onClear}
        aria-label={clearLabel}
        title={clearLabel}
        className={`ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-3)] transition-colors hover:text-[var(--rose)] ${FOCUS_RING}`}
      >
        <CloseOutlined aria-hidden="true" />
      </button>
    </div>
  );
}
