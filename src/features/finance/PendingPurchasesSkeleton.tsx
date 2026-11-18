"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { SkeletonBlock } from "@/components/ui/ContentSkeleton";

// Mirrors one PendingExpensesView list row: merchant, amount, date, confidence
// tag and source on the left; the action buttons on the right.
function PurchaseRowSkeleton() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 py-4 last:border-b-0">
      <div className="space-y-2">
        <SkeletonBlock className="h-5 w-44 max-w-full" />
        <SkeletonBlock className="h-6 w-28" />
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-5 w-16 rounded" />
        <SkeletonBlock className="h-3 w-32" />
      </div>
      <div className="flex flex-wrap gap-2">
        <SkeletonBlock className="h-8 w-24" />
        <SkeletonBlock className="h-8 w-40" />
        <SkeletonBlock className="h-8 w-36" />
        <SkeletonBlock className="h-8 w-24" />
      </div>
    </div>
  );
}

export function PendingPurchasesSkeleton({ rows = 4 }: { rows?: number }) {
  const { t } = useLocale();
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">{t("loadingList")}</span>
      <div aria-hidden="true" className="overflow-hidden rounded-lg border border-[var(--border-soft)]">
        {Array.from({ length: rows }, (_, index) => <PurchaseRowSkeleton key={index} />)}
      </div>
    </div>
  );
}
