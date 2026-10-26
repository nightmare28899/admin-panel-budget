"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { CreditCardFace } from "./CreditCardFace";
import type { CreditCardOverviewItem } from "./credit-cards.types";

/**
 * Desktop card rail: every visible card face in one equal-size row (scrolls with snap when
 * it overflows). Each face is a toggle button; the selected one is raised and ringed.
 */
export function CreditCardRail({
  cards,
  selectedId,
  onSelect,
}: {
  cards: CreditCardOverviewItem[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const { t, formatNumber } = useLocale();
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [selectedId]);

  return (
    <div
      role="group"
      aria-label={t("cardRailLabel")}
      className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3 pt-2"
    >
      {cards.map((card) => {
        const selected = card.id === selectedId;
        const percent = card.creditStatus.utilizationPercent;
        return (
          <button
            key={card.id}
            ref={selected ? selectedRef : undefined}
            type="button"
            aria-pressed={selected}
            aria-label={t("cardStackCardLabel", { card: `${card.bank} ${card.name}`, last4: card.last4 })}
            onClick={() => onSelect(card.id)}
            className={`group w-60 shrink-0 cursor-pointer snap-start rounded-2xl text-left transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 motion-reduce:transition-none ${
              selected
                ? "-translate-y-1 ring-2 ring-sky-400 ring-offset-4 ring-offset-[var(--bg-1)]"
                : `hover:-translate-y-0.5 ${card.isActive ? "" : "opacity-60"}`
            }`}
          >
            <CreditCardFace card={card} />
            <span className="mt-2 flex items-baseline justify-between gap-2 px-1 font-mono text-xs">
              <span className="truncate font-semibold tabular-nums text-[var(--text-1)]">
                {card.currency} {formatNumber(card.creditStatus.owedBalance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {card.creditStatus.limit != null && (
                <span className="shrink-0 text-[var(--text-3)]">
                  {t("percentUsed", { percent: formatNumber(percent ?? 0) })}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
