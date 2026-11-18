"use client";

import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { moveCard, shiftCard } from "./cardOrder";
import { CreditCardFace } from "./CreditCardFace";
import type { CreditCardOverviewItem } from "./credit-cards.types";

/**
 * Desktop card rail: every visible card face in one equal-size row (scrolls with snap when
 * it overflows). Each face is a toggle button; the selected one is raised and ringed.
 * Faces can be reordered by drag and drop (drop lands before the target; the trailing zone
 * moves to the end) or with Alt + Left/Right while focused. `onReorder` gets the new visible id order.
 */
export function CreditCardRail({
  cards,
  selectedId,
  onSelect,
  onReorder,
}: {
  cards: CreditCardOverviewItem[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onReorder: (visibleIds: string[]) => void;
}) {
  const { t, formatNumber } = useLocale();
  const selectedRef = useRef<HTMLButtonElement>(null);

  const [draggingId, setDraggingId] = useState<string>();
  const [overId, setOverId] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const railRef = useRef<HTMLDivElement>(null);
  const refocusId = useRef<string | undefined>(undefined);
  const ids = cards.map((card) => card.id);
  const reorderable = cards.length > 1;
  const END = "__end__";
  const hintId = useId();

  // Moving a keyed node can drop focus; restore it on the moved face after the new order renders.
  useEffect(() => {
    if (!refocusId.current) return;
    const id = refocusId.current;
    refocusId.current = undefined;
    railRef.current?.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`)?.focus();
  }, [cards]);

  const cardName = (id: string) => {
    const card = cards.find((item) => item.id === id);
    return card ? `${card.bank} ${card.name}` : "";
  };

  const endDrag = () => {
    setDraggingId(undefined);
    setOverId(undefined);
  };

  const dropOn = (targetId: string) => {
    const from = draggingId;
    endDrag();
    if (!from) return;
    const next = targetId === END ? shiftCard(ids, from, ids.length - 1 - ids.indexOf(from)) : moveCard(ids, from, targetId);
    if (next === ids) return;
    onReorder(next);
    setAnnouncement(t("cardReorderMoved", { card: cardName(from), position: next.indexOf(from) + 1, total: next.length }));
  };

  const allowDrop = (event: DragEvent, targetId: string) => {
    if (!draggingId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (overId !== targetId) setOverId(targetId);
  };

  const onKeyDown = (event: KeyboardEvent, id: string) => {
    if (!reorderable || !event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    const next = shiftCard(ids, id, event.key === "ArrowLeft" ? -1 : 1);
    if (next === ids) return;
    refocusId.current = id;
    onReorder(next);
    setAnnouncement(t("cardReorderMoved", { card: cardName(id), position: next.indexOf(id) + 1, total: next.length }));
  };

  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [selectedId]);

  return (
    <div
      ref={railRef}
      role="group"
      aria-label={t("cardRailLabel")}
      // Padding leaves room for the selected face's lift and ring, which overflow-x clipping would cut.
      className="-mx-3 mb-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-3 pb-3 pt-4"
    >
      <span id={hintId} className="sr-only">{t("cardReorderHint")}</span>
      <span aria-live="polite" className="sr-only">{announcement}</span>
      {cards.map((card) => {
        const dragging = card.id === draggingId;
        const dropTarget = draggingId !== undefined && !dragging && card.id === overId;
        const selected = card.id === selectedId;
        const percent = card.creditStatus.utilizationPercent;
        return (
          <button
            key={card.id}
            ref={selected ? selectedRef : undefined}
            type="button"
            data-card-id={card.id}
            draggable={reorderable}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", card.id);
              setDraggingId(card.id);
              setAnnouncement(t("cardReorderGrabbed", { card: `${card.bank} ${card.name}` }));
            }}
            onDragOver={(event) => allowDrop(event, card.id)}
            onDrop={(event) => {
              event.preventDefault();
              dropOn(card.id);
            }}
            onDragEnd={endDrag}
            onKeyDown={(event) => onKeyDown(event, card.id)}
            aria-keyshortcuts={reorderable ? "Alt+ArrowLeft Alt+ArrowRight" : undefined}
            aria-describedby={reorderable ? hintId : undefined}
            aria-pressed={selected}
            aria-label={t("cardStackCardLabel", { card: `${card.bank} ${card.name}`, last4: card.last4 })}
            onClick={() => onSelect(card.id)}
            className={`group relative min-w-52 max-w-72 flex-1 basis-52 snap-start rounded-2xl text-left transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 motion-reduce:transition-none ${
              selected
                ? "-translate-y-1 ring-2 ring-sky-400 ring-offset-4 ring-offset-[var(--bg-1)]"
                : `hover:-translate-y-0.5 ${card.isActive ? "" : "opacity-60"}`
            } ${reorderable ? (dragging ? "cursor-grabbing opacity-40" : "cursor-grab") : "cursor-pointer"}`}
          >
            {dropTarget && (
              <span aria-hidden="true" className="pointer-events-none absolute -left-2.5 bottom-0 top-0 w-1 rounded-full bg-sky-400 shadow-[0_0_8px_var(--tw-shadow-color)] shadow-sky-400" />
            )}
            {reorderable && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-2 z-10 rounded-md bg-black/40 px-1 text-sm leading-5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
              >
                ⠿
              </span>
            )}
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
      {reorderable && draggingId && (
        <div
          aria-hidden="true"
          onDragOver={(event) => allowDrop(event, END)}
          onDrop={(event) => {
            event.preventDefault();
            dropOn(END);
          }}
          className={`relative -ml-2 w-8 shrink-0 rounded-xl ${overId === END ? "after:absolute after:inset-y-0 after:left-1 after:w-1 after:rounded-full after:bg-sky-400" : ""}`}
        />
      )}
    </div>
  );
}
