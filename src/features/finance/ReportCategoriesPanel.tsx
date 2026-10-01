"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { WalletOutlined } from "@ant-design/icons";
import { categoryTokens } from "./categoryVisuals";
import type { CategoryTotal } from "./reportInsights";
import { ReportTrendChip, type TrendDirection } from "./ReportKpiTile";

// Rank-based palette from the reports mockup (amber, blue, emerald, ...).
// Static class strings so Tailwind can see every utility.
const RANK_STYLE = [
  { chip: "bg-amber-500/10 text-amber-400", bar: "bg-amber-400" },
  { chip: "bg-blue-500/10 text-blue-400", bar: "bg-blue-500" },
  { chip: "bg-emerald-500/10 text-emerald-400", bar: "bg-emerald-500" },
  { chip: "bg-purple-500/10 text-purple-400", bar: "bg-purple-500" },
  { chip: "bg-rose-500/10 text-rose-400", bar: "bg-rose-500" },
] as const;

export const MAX_REPORT_CATEGORIES = 5;

export type CategoryTrend = { direction: TrendDirection; pct: number };

export function ReportCategoriesPanel({
  items,
  grandTotal,
  currency,
  trends,
}: {
  items: CategoryTotal[];
  grandTotal: number;
  currency: string;
  /** Per category key (id or "none"); absent when there is nothing to compare. */
  trends: Record<string, CategoryTrend | undefined>;
}) {
  const { t, formatNumber } = useLocale();
  const visible = items.slice(0, MAX_REPORT_CATEGORIES);

  return (
    <div className="rounded-2xl border border-[#18262E] bg-[#0D1418] p-6 lg:col-span-2">
      <div className="border-b border-[#18262E] pb-4">
        <h3 className="text-sm font-bold text-white">{t("topCategories")}</h3>
        <p className="mt-0.5 text-xs text-slate-400">{t("topCategoriesDescription")}</p>
      </div>
      <ul className="mt-5 space-y-4">
        {visible.map((item, index) => {
          const style = RANK_STYLE[index % RANK_STYLE.length];
          const visual = categoryTokens(item.category);
          const Icon = visual.icon.kind === "component" ? visual.icon.component : null;
          const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
          const trend = trends[item.id ?? "none"];
          const name = item.category?.name ?? t("uncategorized");
          return (
            <li key={item.id ?? "none"}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${style.chip}`}
                  >
                    {visual.icon.kind === "glyph" ? (
                      visual.icon.glyph
                    ) : Icon && item.category ? (
                      <Icon />
                    ) : (
                      <WalletOutlined />
                    )}
                  </span>
                  <span className="truncate font-medium text-slate-200">{name}</span>
                  <span className="shrink-0 text-[10px] text-slate-500">
                    {t("purchasesCount", { count: formatNumber(item.count) })}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-right">
                  {trend && <ReportTrendChip direction={trend.direction} pct={trend.pct} />}
                  <div>
                    <span className="font-bold text-white">
                      {formatNumber(item.total, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-[10px] font-medium text-slate-500">{currency}</span>
                    </span>
                    <span className="ml-1 text-[11px] text-slate-400">
                      {formatNumber(pct, { maximumFractionDigits: 1 })}%
                    </span>
                  </div>
                </div>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct)}
                aria-label={name}
                className="h-1.5 w-full overflow-hidden rounded-full border border-[#18262E] bg-[#060A0C]"
              >
                <div
                  className={`h-full rounded-full ${style.bar}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ReportDiagnosisPanel({ insights }: { insights: string[] }) {
  const { t } = useLocale();
  if (insights.length === 0) return null;
  const [headline, ...rest] = insights;
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0D1418] to-[#0e1a16] p-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <span>{t("financialDiagnosis")}</span>
        </div>
        <h4 className="mt-3 text-base font-bold leading-snug text-white">{headline}</h4>
        {rest.length > 0 && (
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
            {rest.map((text) => (
              <li key={text} className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-6 border-t border-emerald-500/20 pt-4 text-[11px] text-slate-400">
        {t("insightsFootnote")}
      </div>
    </div>
  );
}
