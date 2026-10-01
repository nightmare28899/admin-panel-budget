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

const CARD_ARTWORK_BY_IDENTITY: Record<string, string> = {
  "banamex oro": "/cards/banamex-oro.svg",
  "banamex azul": "/cards/banamex-blue.svg",
  banamex: "/cards/banamex-classic.svg",
  "banamex clasica": "/cards/banamex-classic.svg",
  "banamex classic": "/cards/banamex-classic.svg",
  rappi: "/cards/rappicard.svg",
  "rappi card": "/cards/rappicard.svg",
  rappicard: "/cards/rappicard.svg",
  bbva: "/cards/bbva.svg",
};

function normalizeCardIdentity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:mastercard|visa)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function creditCardArtworkBackground(card: {
  id: string;
  name: string;
  bank: string;
  color?: string | null;
}): string {
  const name = normalizeCardIdentity(card.name);
  const bank = normalizeCardIdentity(card.bank);

  if (name.startsWith("budget demo") || bank.startsWith("budget demo")) {
    return creditCardBackground(card);
  }

  const combinedIdentity = normalizeCardIdentity(`${card.bank} ${card.name}`);
  const artworkPath =
    CARD_ARTWORK_BY_IDENTITY[combinedIdentity] ??
    CARD_ARTWORK_BY_IDENTITY[name] ??
    CARD_ARTWORK_BY_IDENTITY[bank];

  return artworkPath
    ? `url("${artworkPath}") center / cover no-repeat`
    : creditCardBackground(card);
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

/**
 * Network mark for the card face, derived only from the stored brand text:
 * VISA wordmark, Mastercard circles, otherwise the brand text itself.
 */
export function CreditCardBrandMark({ brand }: { brand: string }) {
  const normalized = brand.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized) return null;

  if (normalized.includes("visa")) {
    return (
      <span className="relative shrink-0 text-lg font-extrabold italic leading-none tracking-tight text-white drop-shadow-sm">
        VISA
      </span>
    );
  }

  if (normalized.includes("mastercard")) {
    return (
      <span role="img" aria-label="Mastercard" className="relative flex shrink-0 items-center">
        <span className="h-6 w-6 rounded-full bg-red-500/90" />
        <span className="-ml-2.5 h-6 w-6 rounded-full bg-amber-400/90 mix-blend-screen" />
      </span>
    );
  }

  return (
    <span className="relative shrink-0 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/85">
      {brand}
    </span>
  );
}
