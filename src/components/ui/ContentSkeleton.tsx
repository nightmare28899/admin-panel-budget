import type { HTMLAttributes } from "react";

export function SkeletonBlock({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[var(--bg-3)] motion-reduce:animate-none ${className}`}
      {...props}
    />
  );
}

function LoadingStatus({ label }: { label: string }) {
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {label}
    </span>
  );
}

export function MetricCardsSkeleton({
  count = 3,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-3 ${className}`}>
      <LoadingStatus label="Loading summary" />
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-2)] p-4"
          aria-hidden="true"
        >
          <SkeletonBlock className="mb-3 h-3 w-24" />
          <SkeletonBlock className="h-7 w-32" />
          <SkeletonBlock className="mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CreditCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true">
      <LoadingStatus label="Loading credit cards" />
      <div className="flex gap-4 overflow-hidden" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <SkeletonBlock key={index} className="h-40 w-56 shrink-0 rounded-[28px]" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]" aria-busy="true">
      <LoadingStatus label="Loading table" />
      <div
        className="grid gap-4 border-b border-[var(--border-soft)] px-5 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(5rem, 1fr))` }}
        aria-hidden="true"
      >
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonBlock key={index} className="h-3 w-16 max-w-full" />
        ))}
      </div>
      <div aria-hidden="true">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 border-b border-[var(--border-soft)] px-5 py-4 last:border-b-0"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(5rem, 1fr))` }}
          >
            {Array.from({ length: columns }, (_, columnIndex) => (
              <SkeletonBlock
                key={columnIndex}
                className={`h-4 max-w-full ${columnIndex === 0 ? "w-32" : "w-20"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true">
      <LoadingStatus label="Loading list" />
      <div aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-5 border-b border-[var(--border-soft)] py-4 last:border-b-0"
          >
            <div className="flex-1">
              <SkeletonBlock className="h-4 w-40 max-w-[70%]" />
              <SkeletonBlock className="mt-2 h-3 w-28 max-w-[50%]" />
            </div>
            <SkeletonBlock className="h-8 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="py-4" aria-busy="true">
      <LoadingStatus label="Loading chart" />
      <div className="flex h-48 items-end gap-3" aria-hidden="true">
        {[45, 72, 38, 84, 56, 68, 42, 76, 52, 64].map((height, index) => (
          <SkeletonBlock key={index} className="min-w-4 flex-1" style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <LoadingStatus label="Loading form" />
      <div aria-hidden="true" className="space-y-5">
        <SkeletonBlock className="h-16 w-full" />
        <div>
          <SkeletonBlock className="mb-2 h-3 w-24" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
        <div>
          <SkeletonBlock className="mb-2 h-3 w-32" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
        <div>
          <SkeletonBlock className="mb-2 h-3 w-28" />
          <SkeletonBlock className="h-24 w-full" />
        </div>
        <SkeletonBlock className="h-10 w-36" />
      </div>
    </div>
  );
}
