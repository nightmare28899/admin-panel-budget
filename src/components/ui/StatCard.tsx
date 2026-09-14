import type { ReactNode } from "react";

export type StatCardTone = "emerald" | "gold" | "rose" | "info";

const BORDER: Record<StatCardTone, string> = {
  emerald: "border-[var(--emerald)]/25",
  gold: "border-[var(--gold)]/25",
  rose: "border-[var(--rose)]/25",
  info: "border-[var(--info)]/25",
};

const GLOW: Record<StatCardTone, string> = {
  emerald: "bg-[radial-gradient(120%_100%_at_0%_0%,var(--emerald-dim),transparent_55%)]",
  gold: "bg-[radial-gradient(120%_100%_at_0%_0%,var(--gold-dim),transparent_55%)]",
  rose: "bg-[radial-gradient(120%_100%_at_0%_0%,var(--rose-dim),transparent_55%)]",
  info: "bg-[radial-gradient(120%_100%_at_0%_0%,var(--info-dim),transparent_55%)]",
};

const ICON_CHIP: Record<StatCardTone, string> = {
  emerald: "bg-[var(--emerald-dim)] text-[var(--emerald-text)]",
  gold: "bg-[var(--gold-dim)] text-[var(--gold-text)]",
  rose: "bg-[var(--rose-dim)] text-[var(--rose-text)]",
  info: "bg-[var(--info-dim)] text-[var(--info-text)]",
};

export function StatCard({
  tone,
  icon,
  label,
  value,
  unit,
  trend,
  sparkline,
  extra,
  className = "",
}: {
  tone: StatCardTone;
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  trend?: ReactNode;
  sparkline?: ReactNode;
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${BORDER[tone]} bg-[var(--bg-2)]/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl ${className}`}
    >
      <div className={`pointer-events-none absolute inset-0 ${GLOW[tone]}`} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex min-w-0 items-center gap-2.5">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[18px] ${ICON_CHIP[tone]}`}>
              {icon}
            </span>
            <p className="min-w-0 flex-1 truncate text-[11px] uppercase tracking-[0.04em] text-[var(--text-3)]">{label}</p>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              {unit && <span className="font-mono text-xs text-[var(--text-3)]">{unit}</span>}
              <span className="font-mono text-[22px] font-medium tabular-nums text-[var(--text-1)]">{value}</span>
            </div>
            {(trend || sparkline) && (
              <div className="flex flex-col items-end gap-1">
                {trend}
                {sparkline}
              </div>
            )}
          </div>
        </div>
        {extra && <div className="shrink-0 whitespace-nowrap">{extra}</div>}
      </div>
    </div>
  );
}
