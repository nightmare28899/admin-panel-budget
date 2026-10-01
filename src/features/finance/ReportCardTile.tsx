"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { creditCardTheme, type CardThemeKey } from "./creditCardVisuals";
import type { CardExpenseBreakdownGroup } from "./finance.types";

type TileStyle = {
  chip: string;
  bar: string;
  border: string;
  tint: string;
  pill: string;
  accent: string;
};

// Static class strings so Tailwind can see every utility. Colours per bank
// follow the reports mockup (Banamex red, BBVA blue, RappiCard violet).
const TILE_STYLE: Record<CardThemeKey, TileStyle> = {
  banamex: {
    chip: "from-red-600 to-rose-700",
    bar: "from-rose-600 to-red-500",
    border: "border-rose-900/40 hover:border-rose-800/70",
    tint: "bg-gradient-to-b from-rose-950/10 to-transparent",
    pill: "border-rose-800/40 bg-rose-950/80 text-rose-300",
    accent: "text-rose-300",
  },
  bbva: {
    chip: "from-blue-700 to-cyan-700",
    bar: "from-blue-600 to-cyan-500",
    border: "border-blue-900/40 hover:border-blue-800/70",
    tint: "bg-gradient-to-b from-blue-950/10 to-transparent",
    pill: "border-blue-800/40 bg-blue-950/80 text-blue-300",
    accent: "text-blue-300",
  },
  rappi: {
    chip: "from-purple-600 to-indigo-600",
    bar: "from-purple-500 via-indigo-400 to-pink-500",
    border: "border-purple-900/40 hover:border-purple-800/70",
    tint: "bg-gradient-to-b from-purple-950/10 to-transparent",
    pill: "border-purple-800/40 bg-purple-950/80 text-purple-300",
    accent: "text-purple-300",
  },
  default: {
    chip: "from-slate-600 to-slate-700",
    bar: "from-emerald-600 to-teal-400",
    border: "border-emerald-900/40 hover:border-emerald-800/70",
    tint: "bg-gradient-to-b from-emerald-950/10 to-transparent",
    pill: "border-emerald-800/40 bg-emerald-950/80 text-emerald-300",
    accent: "text-emerald-300",
  },
};

const NEUTRAL_STYLE: TileStyle = {
  chip: "from-slate-700 to-slate-800",
  bar: "from-slate-500 to-slate-400",
  border: "border-[#18262E] hover:border-slate-700/80",
  tint: "",
  pill: "border-slate-700 bg-slate-800 text-slate-300",
  accent: "text-slate-300",
};

/** Short network code for the brand chip, derived only from the stored brand text. */
export function cardBrandCode(brand: string | undefined): string {
  const normalized = (brand ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized) return "—";
  if (normalized.includes("visa")) return "VISA";
  if (normalized.includes("master")) return "MC";
  if (normalized.includes("amex") || normalized.includes("americanexpress")) return "AMEX";
  return normalized.slice(0, 4).toUpperCase();
}

function normalizeWords(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** "Banamex" + "Banamex Oro" -> "Banamex Oro"; "Rappi" + "RappiCard" -> "RappiCard". */
export function cardDisplayName(card: { bank: string; name: string }): string {
  const bank = card.bank.trim();
  const name = card.name.trim();
  if (!bank) return name;
  if (!name) return bank;
  return normalizeWords(name).includes(normalizeWords(bank)) ||
    normalizeWords(bank).includes(normalizeWords(name))
    ? name.length >= bank.length
      ? name
      : bank
    : `${bank} ${name}`;
}

export function ReportCardTile({
  group,
  primaryCurrency,
  sharePercent,
  isTop,
}: {
  group: CardExpenseBreakdownGroup;
  primaryCurrency: string | null;
  /** Share of the primary-currency spend, or null when it is not computable. */
  sharePercent: number | null;
  isTop: boolean;
}) {
  const { t, formatNumber } = useLocale();
  const card = group.card;
  const style = card ? TILE_STYLE[creditCardTheme(card).key] : NEUTRAL_STYLE;
  const money = (value: number) =>
    formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const primaryTotal = primaryCurrency
    ? group.totalsByCurrency.find((item) => item.currency === primaryCurrency)?.total
    : undefined;
  const otherTotals = group.totalsByCurrency.filter(
    (item) => item.currency !== primaryCurrency,
  );
  const mainTotals = primaryTotal !== undefined ? [] : group.totalsByCurrency.slice(0, 1);
  const highlighted = isTop && card;

  return (
    <section
      className={`group flex flex-col justify-between rounded-2xl border bg-[#0D1418] p-5 transition-all ${
        highlighted ? `${style.border} ${style.tint}` : "border-[#18262E] hover:border-slate-700/80"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-[#18262E] pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className={`flex h-6 w-9 shrink-0 items-center justify-center rounded bg-gradient-to-r text-[9px] font-bold tracking-wider text-white shadow ${style.chip}`}
            >
              {cardBrandCode(card?.brand)}
            </div>
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 truncate text-sm font-bold leading-tight text-slate-200">
                <span className="truncate">{card ? cardDisplayName(card) : t("noCard")}</span>
                {highlighted && (
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full bg-gradient-to-r ${style.bar}`}
                  />
                )}
              </h3>
              {card && (
                <p className="font-mono text-[11px] text-slate-500">•••• {card.last4}</p>
              )}
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
              highlighted ? `${style.pill} font-semibold` : "border-slate-700 bg-slate-800 font-medium text-slate-300"
            }`}
          >
            {t("expensesCount", { count: formatNumber(group.expenseCount) })}
          </span>
        </div>

        <div className="mt-4">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("accumulatedAmount")}
          </span>
          {primaryTotal !== undefined && primaryCurrency && (
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-xl font-extrabold tracking-tight text-white">
                {money(primaryTotal)}
              </span>
              <span
                className={`text-xs font-medium ${highlighted ? style.accent : "text-slate-400"}`}
              >
                {primaryCurrency}
              </span>
            </div>
          )}
          {mainTotals.map((item) => (
            <div key={item.currency} className="mt-0.5 flex items-baseline gap-1">
              <span className="text-xl font-extrabold tracking-tight text-white">
                {money(item.total)}
              </span>
              <span className="text-xs font-medium text-slate-400">{item.currency}</span>
            </div>
          ))}
          {otherTotals.length > 0 && primaryTotal !== undefined && (
            <div className="mt-1.5 space-y-0.5">
              {otherTotals.map((item) => (
                <p key={item.currency} className="font-mono text-xs text-slate-400">
                  {money(item.total)} {item.currency}
                </p>
              ))}
            </div>
          )}
        </div>

        {sharePercent !== null && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{t("spendShare")}</span>
              <span
                className={highlighted ? `font-bold ${style.accent}` : "font-semibold text-slate-200"}
              >
                {formatNumber(sharePercent, { maximumFractionDigits: 1 })}%
                {isTop ? ` ${t("principalTag")}` : ""}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(sharePercent)}
              aria-label={t("currencySpendShare", {
                percent: formatNumber(sharePercent, { maximumFractionDigits: 1 }),
                currency: primaryCurrency ?? "",
              })}
              className="h-2 w-full overflow-hidden rounded-full border border-[#18262E] bg-[#060A0C] p-0.5"
            >
              <div
                className={`h-full rounded-full bg-gradient-to-r ${style.bar}`}
                style={{ width: `${Math.min(100, Math.max(0, sharePercent))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
