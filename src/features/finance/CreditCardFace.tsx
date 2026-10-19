"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import {
  creditCardArtworkImage,
  CreditCardBrandMark,
  CreditCardContactlessIcon,
  CreditCardEmvChip,
  creditCardTheme,
} from "./creditCardVisuals";
import type { CreditCardOverviewItem } from "./credit-cards.types";

/** The physical-card artwork shared by the grid tile and the stacked wallet view. */
export function CreditCardFace({ card, className = "" }: { card: CreditCardOverviewItem; className?: string }) {
  const { t } = useLocale();
  const theme = creditCardTheme(card);
  const artwork = creditCardArtworkImage(card);
  const faceBackground = artwork ?? theme.background;
  const bankWords = card.bank.trim().split(/\s+/);
  const accentBankWord = theme.key === "rappi" ? bankWords[0] : null;
  const bankRest = accentBankWord ? bankWords.slice(1).join(" ") : "";

  return (
      <div
        style={{ background: faceBackground, boxShadow: theme.glow }}
        className={`relative flex h-44 select-none flex-col justify-between overflow-hidden rounded-2xl border p-4 ${theme.borderClass} ${className}`}
      >
        {theme.key === "banamex" && (
          <>
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-44 w-44 rounded-full bg-white/10 blur-xl" />
            <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 bg-gradient-to-bl from-rose-400/20 to-transparent" />
          </>
        )}
        {theme.key === "bbva" && (
          <>
            <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-cyan-300/15 blur-lg" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
          </>
        )}
        {theme.key === "rappi" && (
          <>
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(120% 90% at 90% 10%, rgba(56, 189, 248, 0.35) 0%, rgba(139, 92, 246, 0.45) 50%, rgba(15, 23, 42, 0) 100%)" }}
            />
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-violet-600/20 blur-2xl" />
          </>
        )}
        {theme.key === "default" && !artwork && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/30" />
        )}

        <div className="relative flex items-start justify-between">
          <span className="truncate text-sm font-extrabold uppercase tracking-widest text-white drop-shadow">
            {accentBankWord ? (
              <>
                <span className="text-orange-400">{accentBankWord}</span>
                {bankRest && <> {bankRest}</>}
              </>
            ) : (
              card.bank
            )}
          </span>
          <div className="flex items-center gap-2">
            {!card.isActive && (
              <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/85">
                {t("inactive")}
              </span>
            )}
            <CreditCardContactlessIcon />
          </div>
        </div>

        <div className="relative">
          <CreditCardEmvChip />
          <p className="mt-2 font-mono text-[15px] font-semibold tracking-[0.15em] text-white/95 drop-shadow-sm">
            •••• •••• •••• {card.last4}
          </p>
        </div>

        <div className="relative flex items-end justify-between gap-2">
          <span className="truncate font-mono text-[11px] font-medium uppercase tracking-wider text-white/80">{card.name}</span>
          {card.brand && <CreditCardBrandMark brand={card.brand} />}
        </div>
      </div>
  );
}
