"use client";

import { useLocale } from "@/i18n/LocaleProvider";

// Mirrors CreditCardManager's layout (header controls, 4 KPI tiles, section
// title, 3-column grid of CreditCardTile) with the same sizes, radii and dark
// palette, so the page doesn't jump when the overview arrives.

function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-800/70 motion-reduce:animate-none ${className}`} />;
}

function KpiTileSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#111A2C] to-[#0D1424] p-5">
      <div className="flex items-start justify-between gap-3">
        <Bone className="h-3 w-28" />
        <Bone className="h-8 w-8 rounded-xl" />
      </div>
      <Bone className="mt-4 h-7 w-32" />
      <Bone className="mt-4 h-3 w-24" />
      <Bone className="mt-2 h-1.5 w-full rounded-full" />
    </div>
  );
}

function CardTileSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-800/90 bg-[#0D1422]">
      {/* Card face: same h-44 / m-3 / rounded-2xl box as the real one. */}
      <div className="relative m-3 flex h-44 flex-col justify-between overflow-hidden rounded-2xl border border-slate-700/40 bg-gradient-to-br from-slate-800/80 via-slate-800/50 to-slate-900/80 p-4">
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-br from-white/5 via-transparent to-transparent motion-reduce:animate-none" />
        <div className="relative flex items-start justify-between">
          <Bone className="h-4 w-24 bg-slate-700/70" />
          <Bone className="h-4 w-4 rounded-full bg-slate-700/70" />
        </div>
        <div className="relative">
          <Bone className="h-7 w-10 rounded-md bg-slate-700/70" />
          <Bone className="mt-3 h-4 w-44 bg-slate-700/70" />
        </div>
        <div className="relative flex items-end justify-between">
          <Bone className="h-3 w-20 bg-slate-700/70" />
          <Bone className="h-5 w-12 bg-slate-700/70" />
        </div>
      </div>

      <div className="flex-1 space-y-3 px-4 pb-4">
        <div>
          <div className="flex items-center justify-between">
            <Bone className="h-3 w-28" />
            <Bone className="h-5 w-20 rounded-full" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <Bone className="h-4 w-24" />
            <Bone className="h-3 w-28" />
          </div>
          <Bone className="mt-3 h-2 w-full rounded-full" />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <div className="space-y-2">
            <Bone className="h-2.5 w-32" />
            <Bone className="h-3.5 w-40" />
          </div>
          <Bone className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CreditCardsPageSkeleton({ cards = 3 }: { cards?: number }) {
  const { t } = useLocale();

  return (
    <div aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        {t("loadingCreditCards")}
      </span>

      <div aria-hidden="true">
        {/* Header: real title so it doesn't flash; placeholders for badge and controls. */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-white">{t("myCards")}</h1>
              <Bone className="h-6 w-20 rounded-full" />
            </div>
            <p className="mt-1 text-sm text-slate-400">{t("trackCardsDescription")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
              <Bone className="h-7 w-20 rounded-lg" />
              <Bone className="h-7 w-20 rounded-lg" />
              <Bone className="h-7 w-20 rounded-lg" />
            </div>
            <Bone className="h-9 w-44 rounded-xl" />
            <Bone className="h-9 w-36 rounded-xl" />
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <KpiTileSkeleton key={index} />
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <Bone className="h-5 w-56" />
          <Bone className="h-3 w-40" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: cards }, (_, index) => (
            <CardTileSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
