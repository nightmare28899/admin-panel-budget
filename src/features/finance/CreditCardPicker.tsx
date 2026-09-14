"use client";

import type { CreditCardSummary } from "./statement-import.types";
import { useLocale } from "@/i18n/LocaleProvider";
import {
  creditCardBackground,
  CreditCardChipIcon,
  CreditCardContactlessIcon,
} from "./creditCardVisuals";

type CreditCardPickerProps = {
  cards: CreditCardSummary[];
  selectedCardId: string | undefined;
  onSelect: (cardId: string | undefined) => void;
  emptyMessage?: string;
  /** Hide the dashed "no card" tile for flows where a card is mandatory. */
  hideEmptyOption?: boolean;
};

export function CreditCardPicker({
  cards,
  selectedCardId,
  onSelect,
  emptyMessage,
  hideEmptyOption = false,
}: CreditCardPickerProps) {
  const { t } = useLocale();
  if (cards.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--border-soft)] px-3 py-3 text-sm text-[var(--text-3)]">
        {emptyMessage ?? t("noActiveCards")}
      </p>
    );
  }

  return (
    <div
      className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-4 pt-4"
      role="radiogroup"
      aria-label={t("creditCard")}
    >
      {!hideEmptyOption && (
        <button
          type="button"
          role="radio"
          aria-checked={selectedCardId === undefined}
          onClick={() => onSelect(undefined)}
          className={`flex h-40 w-40 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden! rounded-[28px] border-2 border-dashed text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)] ${
            selectedCardId === undefined
              ? "border-[var(--emerald)] bg-[var(--emerald-dim)] text-[var(--emerald-text)]"
              : "border-[var(--border-soft)] text-[var(--text-3)] hover:border-[var(--border)] hover:text-[var(--text-2)]"
          }`}
        >
          <span className="text-2xl" aria-hidden="true">—</span>
          <span className="text-xs font-semibold">{t("noCard")}</span>
        </button>
      )}

      {cards.map((card) => {
        const selected = card.id === selectedCardId;
        const background = creditCardBackground(card);
        return (
          <button
            key={card.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t("cardEnding", { bank: card.bank, name: card.name, last4: card.last4 })}
            onClick={() => onSelect(card.id)}
            style={{
              background,
              boxShadow: selected
                ? `0 18px 34px -12px ${background}, 0 0 0 2px var(--emerald)`
                : `0 12px 24px -14px ${background}`,
            }}
            className={`group relative flex h-40 w-56 shrink-0 cursor-pointer flex-col justify-between overflow-hidden! rounded-[28px] p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-1)] ${
              selected ? "-translate-y-1 scale-[1.03]" : "hover:-translate-y-1 hover:scale-[1.015]"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/30" />

            <div className="relative flex items-start justify-between">
              <span className="truncate text-xs font-bold uppercase tracking-wide text-white/90">
                {card.bank}
              </span>
              <div className="flex items-center gap-2">
                <CreditCardContactlessIcon />
                {selected && (
                  <span className="flex h-6 w-6 animate-badge-pop items-center justify-center rounded-full bg-white text-xs font-bold text-[var(--emerald-text)] shadow-sm">
                    ✓
                  </span>
                )}
              </div>
            </div>

            <CreditCardChipIcon />

            <div className="relative">
              <p className="font-mono text-[15px] tracking-[0.15em] text-white drop-shadow-sm">
                •••• •••• •••• {card.last4}
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-white/85">{card.name}</span>
                {card.brand && (
                  <span className="shrink-0 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/85">
                    {card.brand}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
