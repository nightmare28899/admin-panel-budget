// Shared visual pieces for anything that renders a credit card as an actual
// card face (the upload picker, the "My Cards" filter, the management grid).
// Kept in one place so all three stay visually consistent.

// No stored brand color to fall back on: pick a deterministic gradient from
// the card id so the same card always renders the same way across reloads.
const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #10b981, #047857)",
  "linear-gradient(135deg, #38bdf8, #0369a1)",
  "linear-gradient(135deg, #f59e0b, #b45309)",
  "linear-gradient(135deg, #a855f7, #6b21a8)",
  "linear-gradient(135deg, #64748b, #334155)",
];

export function creditCardBackground(card: { id: string; color?: string | null }): string {
  if (card.color) return card.color;
  let hash = 0;
  for (let i = 0; i < card.id.length; i += 1) {
    hash = (hash * 31 + card.id.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
}

export function CreditCardChipIcon() {
  return (
    <div className="relative h-6 w-8 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500">
      <div className="absolute inset-x-1 top-[5px] h-px bg-yellow-800/40" />
      <div className="absolute inset-x-1 top-[11px] h-px bg-yellow-800/40" />
      <div className="absolute inset-x-1 top-[17px] h-px bg-yellow-800/40" />
      <div className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-yellow-800/40" />
    </div>
  );
}

export function CreditCardContactlessIcon() {
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
