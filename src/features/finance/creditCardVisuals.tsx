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

// Banamex Oro / Azul variants keep their dedicated artwork; everything else is
// themed with CSS gradients (see CARD_THEMES) or falls back to the card colour.
const CARD_ARTWORK_BY_IDENTITY: Record<string, string> = {
  "banamex oro": "/cards/banamex-oro.svg",
  "banamex azul": "/cards/banamex-blue.svg",
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

export type CardThemeKey = "banamex" | "bbva" | "rappi" | "default";

export type CardTheme = {
  key: CardThemeKey;
  /** CSS `background` for the card face. */
  background: string;
  /** Tailwind border classes of the card face. */
  borderClass: string;
  /** Soft coloured glow under the card face. */
  glow: string;
  /** Tailwind gradient classes for the utilization bar fill. */
  barClass: string;
  /** Tailwind classes for the "% used" badge in its normal (non-warning) state. */
  badgeClass: string;
};

const EMERALD_BADGE = "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

const CARD_THEMES: Record<CardThemeKey, CardTheme> = {
  banamex: {
    key: "banamex",
    background: "linear-gradient(135deg, #E11D48 0%, #BE123C 50%, #881337 100%)",
    borderClass: "border-white/20",
    glow: "0 14px 35px -10px rgba(225, 29, 72, 0.35)",
    barClass: "bg-gradient-to-r from-emerald-500 to-teal-400",
    badgeClass: EMERALD_BADGE,
  },
  bbva: {
    key: "bbva",
    background: "linear-gradient(135deg, #0284C7 0%, #0369A1 50%, #075985 100%)",
    borderClass: "border-cyan-400/30",
    glow: "0 14px 35px -10px rgba(14, 116, 144, 0.4)",
    barClass: "bg-gradient-to-r from-sky-400 to-cyan-300",
    badgeClass: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
  },
  rappi: {
    key: "rappi",
    background: "linear-gradient(135deg, #0b0f19 0%, #161f30 50%, #1e1b4b 100%)",
    borderClass: "border-violet-500/30",
    glow: "0 14px 35px -10px rgba(147, 51, 234, 0.3)",
    barClass: "bg-gradient-to-r from-violet-500 to-indigo-400",
    badgeClass: EMERALD_BADGE,
  },
  default: {
    key: "default",
    background: "",
    borderClass: "border-white/10",
    glow: "0 14px 35px -10px rgba(0, 0, 0, 0.45)",
    barClass: "bg-gradient-to-r from-emerald-500 to-teal-400",
    badgeClass: EMERALD_BADGE,
  },
};

type CardIdentity = { id: string; name: string; bank: string; color?: string | null };

function isBudgetDemo(card: CardIdentity): boolean {
  return normalizeCardIdentity(card.name).startsWith("budget demo")
    || normalizeCardIdentity(card.bank).startsWith("budget demo");
}

function themeKeyFor(card: CardIdentity): CardThemeKey {
  if (isBudgetDemo(card)) return "default";
  const identity = normalizeCardIdentity(`${card.bank} ${card.name}`);
  if (/\bbanamex\b/.test(identity)) return "banamex";
  if (/\bbbva\b/.test(identity)) return "bbva";
  if (/\brappi(?:card)?\b/.test(identity)) return "rappi";
  return "default";
}

/** Visual theme (face gradient, border, glow, bar and badge colours) for a card. */
export function creditCardTheme(card: CardIdentity): CardTheme {
  const theme = CARD_THEMES[themeKeyFor(card)];
  return theme.key === "default"
    ? { ...theme, background: creditCardBackground(card) }
    : theme;
}

/** Banamex Oro / Azul keep their SVG artwork; returns null for every other card. */
export function creditCardArtworkImage(card: CardIdentity): string | null {
  if (isBudgetDemo(card)) return null;
  const combined = normalizeCardIdentity(`${card.bank} ${card.name}`);
  const path = CARD_ARTWORK_BY_IDENTITY[combined];
  return path ? `url("${path}") center / cover no-repeat` : null;
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

/** EMV chip with the gold-to-pink gradient used on the card faces of the cards page. */
export function CreditCardEmvChip() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-7 w-10 shrink-0 items-center justify-center rounded-md shadow-inner"
      style={{ background: "linear-gradient(135deg, #fce043 0%, #fb7ba2 100%)" }}
    >
      <div className="pointer-events-none absolute inset-0.5 rounded-[4px] border border-black/30" />
      <div className="h-4 w-6 border-y border-black/30" />
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
