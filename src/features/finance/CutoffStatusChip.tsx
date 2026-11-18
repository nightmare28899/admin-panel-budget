"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import type { CutoffPaymentStatus } from "./cardCutoffStatus";

const LABEL: Record<CutoffPaymentStatus, MessageKey> = {
  PAID_UP: "cutoffStatusPaidUp",
  PARTIAL: "cutoffStatusPartial",
  UNPAID_DUE_FUTURE: "cutoffStatusUnpaid",
  OVERDUE: "cutoffStatusOverdue",
  CUTOFF_NEEDS_STATEMENT: "cutoffStatusNeedsStatement",
  NO_CUTOFF_CONFIGURED: "cutoffStatusNoCutoff",
};

// Static class strings so Tailwind can see every utility.
const CHIP_CLASS: Record<CutoffPaymentStatus, string> = {
  PAID_UP: "border-emerald-500/30 bg-emerald-500/15 text-[var(--emerald-text)]",
  PARTIAL: "border-amber-500/30 bg-amber-500/15 text-[var(--gold-text)]",
  UNPAID_DUE_FUTURE: "border-amber-500/30 bg-amber-500/15 text-[var(--gold-text)]",
  OVERDUE: "border-rose-500/30 bg-rose-500/15 text-[var(--rose-text)]",
  CUTOFF_NEEDS_STATEMENT: "border-sky-500/30 bg-sky-500/15 text-[var(--info-text)]",
  NO_CUTOFF_CONFIGURED: "border-[var(--border-soft)] bg-[var(--bg-3)] text-[var(--text-3)]",
};

const DOT_CLASS: Record<CutoffPaymentStatus, string> = {
  PAID_UP: "bg-emerald-400",
  PARTIAL: "bg-amber-400",
  UNPAID_DUE_FUTURE: "bg-amber-400",
  OVERDUE: "bg-rose-400",
  CUTOFF_NEEDS_STATEMENT: "bg-sky-400",
  NO_CUTOFF_CONFIGURED: "bg-[var(--text-3)]",
};

export function CutoffStatusChip({ status }: { status: CutoffPaymentStatus }) {
  const { t } = useLocale();
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${CHIP_CLASS[status]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[status]}`} />
      {t(LABEL[status])}
    </span>
  );
}

/** "today" / "1 day ago" / "N days ago" for a non-negative day count. */
export function useCutoffAgo() {
  const { t, formatNumber } = useLocale();
  return (days: number): string =>
    days <= 0 ? t("cutoffToday") : days === 1 ? t("cutoffDayAgo") : t("cutoffDaysAgo", { count: formatNumber(days) });
}
