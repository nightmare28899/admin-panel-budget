import type { CreditCardSummary } from "./statement-import.types";

// No stored brand color to fall back on: pick a deterministic gradient from
// the card id so the same card always renders the same way across reloads.
// Kept vivid on purpose — this mirrors the "gamified finance" card-wallet
// look the user pointed at, as opposed to the app's usual muted surfaces.
const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #10b981, #047857)",
  "linear-gradient(135deg, #38bdf8, #0369a1)",
  "linear-gradient(135deg, #f59e0b, #b45309)",
  "linear-gradient(135deg, #a855f7, #6b21a8)",
  "linear-gradient(135deg, #64748b, #334155)",
];

function fallbackGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
}

function ChipIcon() {
  return (
    <div className="relative h-6 w-8 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500">
      <div className="absolute inset-x-1 top-[5px] h-px bg-yellow-800/40" />
      <div className="absolute inset-x-1 top-[11px] h-px bg-yellow-800/40" />
      <div className="absolute inset-x-1 top-[17px] h-px bg-yellow-800/40" />
      <div className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-yellow-800/40" />
    </div>
  );
}

function ContactlessIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white/70" aria-hidden="true">
      <path
        d="M4 14a11 11 0 0 1 16 0M7 17.5a6.5 6.5 0 0 1 10 0M10 21a2 2 0 0 1 4 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type CreditCardPickerProps = {
  cards: CreditCardSummary[];
  selectedCardId: string | undefined;
  onSelect: (cardId: string | undefined) => void;
  emptyMessage?: string;
};

export function CreditCardPicker({
  cards,
  selectedCardId,
  onSelect,
  emptyMessage,
}: CreditCardPickerProps) {
  if (cards.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--border-soft)] px-3 py-3 text-sm text-[var(--text-3)]">
        {emptyMessage ?? "No active cards."}
      </p>
    );
  }

  return (
    <div
      className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 pt-1"
      role="radiogroup"
      aria-label="Credit card"
    >
      <button
        type="button"
        role="radio"
        aria-checked={selectedCardId === undefined}
        onClick={() => onSelect(undefined)}
        className={`flex h-40 w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-[28px] border-2 border-dashed text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)] ${
          selectedCardId === undefined
            ? "border-[var(--emerald)] bg-[var(--emerald-dim)] text-[var(--emerald-text)]"
            : "border-[var(--border-soft)] text-[var(--text-3)] hover:border-[var(--border)] hover:text-[var(--text-2)]"
        }`}
      >
        <span className="text-2xl" aria-hidden="true">—</span>
        <span className="text-xs font-semibold">No card</span>
      </button>

      {cards.map((card) => {
        const selected = card.id === selectedCardId;
        const background = card.color || fallbackGradient(card.id);
        return (
          <button
            key={card.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${card.bank} ${card.name} ending in ${card.last4}`}
            onClick={() => onSelect(card.id)}
            style={{
              background,
              boxShadow: selected
                ? `0 18px 34px -12px ${background}, 0 0 0 2px var(--emerald)`
                : `0 12px 24px -14px ${background}`,
            }}
            className={`group relative flex h-40 w-56 shrink-0 flex-col justify-between overflow-hidden rounded-[28px] p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-1)] ${
              selected ? "-translate-y-1 scale-[1.03]" : "hover:-translate-y-1 hover:scale-[1.015]"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/30" />

            <div className="relative flex items-start justify-between">
              <span className="truncate text-xs font-bold uppercase tracking-wide text-white/90">
                {card.bank}
              </span>
              <div className="flex items-center gap-2">
                <ContactlessIcon />
                {selected && (
                  <span className="flex h-6 w-6 animate-badge-pop items-center justify-center rounded-full bg-white text-xs font-bold text-[var(--emerald-text)] shadow-sm">
                    ✓
                  </span>
                )}
              </div>
            </div>

            <ChipIcon />

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
