"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import type { CreditCardOverviewItem } from "./credit-cards.types";
import { CreditCardFace } from "./CreditCardFace";
import { CARD_STACK, stackHeight, stackSlot, stepIndex } from "./utils/card-stack-layout";

/** Height of CreditCardFace (`h-44`). */
const CARD_HEIGHT = 176;

/**
 * Wallet-style stack: the selected card sits in front, up to two more peek out behind it.
 * Activating the front card fans the stack into a vertical list; picking a card selects it and collapses.
 */
export function CreditCardStack({
  cards,
  selectedIndex,
  onSelect,
}: {
  cards: CreditCardOverviewItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const { t, formatNumber } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const refocusRef = useRef(false);
  const total = cards.length;
  const selected = Math.min(selectedIndex, Math.max(total - 1, 0));

  // Move focus to the (new) front card after a keyboard/click change so it never lands on a hidden card.
  useEffect(() => {
    if (!refocusRef.current) return;
    refocusRef.current = false;
    buttonRefs.current[selected]?.focus();
  });

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setExpanded(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded]);

  if (total === 0) return null;

  const choose = (index: number) => {
    refocusRef.current = true;
    onSelect(index);
    setExpanded(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && expanded) {
      event.preventDefault();
      refocusRef.current = true;
      setExpanded(false);
      return;
    }
    const delta = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1
      : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = stepIndex(selected, total, delta);
    refocusRef.current = true;
    onSelect(next);
  };

  const height = stackHeight({ total, expanded, cardHeight: CARD_HEIGHT });

  return (
    <div ref={rootRef} onKeyDown={onKeyDown}>
      <div
        role="group"
        aria-label={t("cardStackLabel")}
        className="relative mx-auto w-full max-w-sm transition-[height] duration-300 ease-out motion-reduce:transition-none"
        style={{ height }}
      >
        {cards.map((card, index) => {
          const slot = stackSlot(index, { total, selected, expanded });
          const isFront = index === selected;
          const name = t("cardStackCardLabel", { card: `${card.bank} ${card.name}`, last4: card.last4 });
          return (
            <button
              key={card.id}
              ref={(node) => { buttonRefs.current[index] = node; }}
              type="button"
              aria-label={name}
              aria-current={isFront ? "true" : undefined}
              aria-expanded={isFront ? expanded : undefined}
              aria-hidden={slot.visible ? undefined : true}
              tabIndex={slot.visible ? 0 : -1}
              disabled={!slot.visible}
              onClick={() => (isFront && !expanded ? setExpanded(true) : choose(index))}
              className="absolute inset-x-0 cursor-pointer rounded-2xl text-left transition-[transform,opacity] duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 motion-reduce:transition-none"
              style={{
                top: 0,
                height: CARD_HEIGHT,
                transform: `translateY(${slot.top}px) scale(${slot.scale})`,
                transformOrigin: "top center",
                opacity: slot.opacity,
                zIndex: slot.zIndex,
                pointerEvents: slot.visible ? "auto" : "none",
              }}
            >
              <CreditCardFace card={card} className={`${card.isActive ? "" : "opacity-70"} ${expanded && isFront ? "ring-2 ring-[var(--accent)]" : ""}`} />
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 text-xs text-[var(--text-3)]">
        {total > CARD_STACK.maxVisible && (
          <span aria-live="polite" className="rounded-full border border-[var(--border-soft)] bg-[var(--bg-3)] px-2.5 py-0.5 font-mono font-medium text-[var(--text-2)]">
            {t("cardStackPosition", { current: formatNumber(selected + 1), total: formatNumber(total) })}
          </span>
        )}
        {total > 1 && <span>{expanded ? t("cardStackHintCollapse") : t("cardStackHintExpand")}</span>}
      </div>
    </div>
  );
}
