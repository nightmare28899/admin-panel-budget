"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useRouter } from "next/navigation";
import { useId, type ButtonHTMLAttributes } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import {
  creditCardArtworkImage,
  CreditCardBrandMark,
  CreditCardContactlessIcon,
  CreditCardEmvChip,
  creditCardTheme,
} from "./creditCardVisuals";
import { daysUntilDueDate, hasPaymentPending } from "./cardPaymentSchedule";
import type { CreditCardOverviewItem } from "./credit-cards.types";

type Tone = "emerald" | "gold" | "rose";

function usageTone(card: CreditCardOverviewItem): Tone {
  if (card.flags.overLimit) return "rose";
  if (card.flags.highUtilization) return "gold";
  return "emerald";
}

const WARNING_BADGE_CLASS: Record<Exclude<Tone, "emerald">, string> = {
  gold: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  rose: "border-rose-500/20 bg-rose-500/10 text-rose-400",
};

const WARNING_BAR_CLASS: Record<Exclude<Tone, "emerald">, string> = {
  gold: "bg-gradient-to-r from-amber-500 to-amber-400",
  rose: "bg-gradient-to-r from-rose-500 to-rose-400",
};

function Row({
  label,
  valueClassName = "text-slate-300",
  children,
}: {
  label: string;
  valueClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-800/60 py-1.5 text-xs last:border-b-0">
      <span className="text-slate-400">{label}</span>
      <span className={`text-right font-mono font-medium ${valueClassName}`}>{children}</span>
    </div>
  );
}

type FooterVariant = "neutral" | "danger" | "primary";

const FOOTER_BUTTON_CLASS: Record<FooterVariant, string> = {
  neutral: "bg-slate-800/90 text-slate-200 hover:bg-slate-700",
  danger: "border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20",
  primary: "bg-gradient-to-r from-cyan-600 to-sky-600 font-bold text-white shadow-sm hover:from-cyan-500 hover:to-sky-500",
};

function FooterButton({
  variant = "neutral",
  className = "",
  ...rest
}: { variant?: FooterVariant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`cursor-pointer rounded-xl px-3 py-2 text-center text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-sky-400 ${FOOTER_BUTTON_CLASS[variant]} ${className}`}
      {...rest}
    />
  );
}

export function CreditCardTile({
  card,
  detailsExpanded,
  onToggleDetails,
  onEdit,
  onDeactivate,
  onReactivate,
  onDeletePermanently,
}: {
  card: CreditCardOverviewItem;
  detailsExpanded: boolean;
  onToggleDetails: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDeletePermanently: () => void;
}) {
  const router = useRouter();
  const { t, formatNumber, formatDate } = useLocale();
  const formatMoney = (value: number) => `${card.currency} ${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const theme = creditCardTheme(card);
  const artwork = creditCardArtworkImage(card);
  const faceBackground = artwork ?? theme.background;
  const tone = usageTone(card);
  const summary = card.statementSummary;
  const statementPaymentStatus = summary.paymentStatus;
  const statementId = summary.statementImportId;
  const pending = card.isActive && hasPaymentPending(card);
  const daysUntilDue = pending && summary.dueDate ? daysUntilDueDate(summary.dueDate) : null;
  const overdue = daysUntilDue !== null && daysUntilDue < 0;
  const detailsId = useId();
  const detailsToggleId = `credit-card-details-toggle-${detailsId}`;
  const detailsRegionId = `credit-card-details-${detailsId}`;
  const utilization = Math.min(100, Math.max(0, card.creditStatus.utilizationPercent ?? 0));
  const paymentAmount = summary.currentPaymentDue ?? summary.noInterestTarget;

  const emphasisClass = !pending ? "" : overdue ? "ring-1 ring-rose-500/30" : "ring-1 ring-amber-500/20";
  const bankWords = card.bank.trim().split(/\s+/);
  const accentBankWord = theme.key === "rappi" ? bankWords[0] : null;
  const bankRest = accentBankWord ? bankWords.slice(1).join(" ") : "";

  const dueDistance = (days: number): string => {
    const key: MessageKey =
      days === 0 ? "dueTodayShort"
        : days === 1 ? "dueInOneDay"
          : days > 1 ? "dueInDays"
            : days === -1 ? "overdueByOneDay"
              : "overdueByDays";
    return t(key, { count: formatNumber(Math.abs(days)) });
  };

  const menuItems: MenuProps["items"] = [
    ...(statementId ? [{ key: "statement", label: t("viewStatement") }] : []),
    ...(statementId ? [{ type: "divider" as const }] : []),
    { key: "deletePermanently", label: t("deleteCardPermanently"), danger: true },
  ];
  const onMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "statement" && statementId) router.push(`/finance/statements/${statementId}`);
    if (key === "deletePermanently") onDeletePermanently();
  };

  return (
    <div className={`flex flex-col overflow-hidden rounded-3xl border border-slate-800/90 bg-[#0D1422] transition-all duration-300 hover:border-slate-700 hover:shadow-2xl ${emphasisClass} ${card.isActive ? "" : "opacity-60"}`}>
      <div
        style={{ background: faceBackground, boxShadow: theme.glow }}
        className={`relative m-3 flex h-44 select-none flex-col justify-between overflow-hidden rounded-2xl border p-4 ${theme.borderClass}`}
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

      <div className="flex-1 space-y-3 px-4 pb-4">
        {card.creditStatus.limit != null ? (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">{t("projectedDebt")}</span>
              <span className={`rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${tone === "emerald" ? theme.badgeClass : WARNING_BADGE_CLASS[tone]}`}>
                {t("percentUsed", { percent: formatNumber(card.creditStatus.utilizationPercent ?? 0) })}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono text-sm">
              <p className="font-bold tabular-nums text-white">
                {formatMoney(card.creditStatus.owedBalance)}
              </p>
              <p className="text-right text-xs text-slate-400">
                {t("limitLabel")} {formatMoney(card.creditStatus.limit)}
              </p>
            </div>
            <div
              role="progressbar"
              aria-label={t("utilization")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(utilization)}
              className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"
            >
              <div className={`h-2 rounded-full ${tone === "emerald" ? theme.barClass : WARNING_BAR_CLASS[tone]}`} style={{ width: `${utilization}%` }} />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-400">{t("projectedDebt")}</p>
            <p className="mt-1 font-mono text-sm font-bold tabular-nums text-white">
              {formatMoney(card.creditStatus.owedBalance)}
            </p>
            <p className="mt-1 text-xs text-slate-400">{t("noCreditLimit")}</p>
          </div>
        )}

        {statementId ? (
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-xs ${
              pending
                ? overdue
                  ? "border-rose-500/25 bg-rose-500/5"
                  : "border-amber-500/25 bg-amber-500/5"
                : "border-slate-800 bg-slate-900/80"
            }`}
          >
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400">{t("latestStatement")}</p>
              <p className="mt-0.5 font-mono font-medium text-slate-200">
                {summary.periodStart ? formatDate(summary.periodStart, { dateStyle: "medium" }) : "—"}
                {" – "}
                {summary.periodEnd ? formatDate(summary.periodEnd, { dateStyle: "medium" }) : "—"}
              </p>
            </div>
            {statementPaymentStatus === "PAID" ? (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {t("paid")}
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-400 motion-safe:animate-pulse" />
                {statementPaymentStatus === "PARTIAL" ? t("partial") : t("pending")}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">{t("noStatementAvailable")}</p>
        )}

        {pending ? (
          <div>
            {paymentAmount != null && (
              <div
                role="status"
                className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs ${
                  overdue ? "bg-rose-500/5 text-rose-300" : "bg-amber-500/5 text-amber-300"
                }`}
              >
                <span className="flex items-center gap-1 font-medium">
                  <span aria-hidden="true" className={overdue ? "text-rose-400" : "text-amber-400"}>⚠</span>
                  {t("noInterestPayment")}
                </span>
                <span className="font-mono font-bold">{formatMoney(paymentAmount)}</span>
              </div>
            )}
            {summary.dueDate && (
              <Row label={t("paymentDeadline")} valueClassName="font-semibold text-rose-400">
                {formatDate(summary.dueDate, { dateStyle: "medium" })}
                {daysUntilDue !== null && <> ({dueDistance(daysUntilDue)})</>}
              </Row>
            )}
          </div>
        ) : (
          <Row label={t("currentPaymentDue")} valueClassName="font-semibold text-emerald-400">
            {summary.currentPaymentDue == null ? "—" : formatMoney(summary.currentPaymentDue)}
          </Row>
        )}

        <button
          type="button"
          id={detailsToggleId}
          aria-expanded={detailsExpanded}
          aria-controls={detailsRegionId}
          onClick={onToggleDetails}
          className="cursor-pointer rounded-lg px-1 py-1 text-xs font-medium text-slate-400 transition hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          {detailsExpanded ? t("hideDetails") : t("showDetails")}
        </button>

        {detailsExpanded && (
          <div id={detailsRegionId} role="region" aria-labelledby={detailsToggleId}>
            {pending && summary.minimumPayment != null && (
              <Row label={t("minimumPaymentRequired")}>{formatMoney(summary.minimumPayment)}</Row>
            )}
            {summary.deferredInstallmentBalance > 0 && (
              <Row label={pending ? t("deferredInstallments") : t("deferredInstallmentBalance")}>
                {formatMoney(summary.deferredInstallmentBalance)}
              </Row>
            )}
            <Row label={t("projectedNextClose")}>
              {formatMoney(summary.projectedNextCloseAmount)}
              {summary.projectedNextCloseDate && (
                <span className="font-sans text-[10px] text-slate-500"> · {formatDate(summary.projectedNextCloseDate, { dateStyle: "medium" })}</span>
              )}
            </Row>
            <Row label={t("nextClosePaymentEstimate")}>
              {formatMoney(summary.nextClosePaymentEstimate)}
            </Row>
            <Row label={t("remainingAfterNextClose")}>
              {formatMoney(summary.estimatedRemainingAfterNextClose)}
            </Row>

            {card.flags.currencyMismatch && (
              <p role="status" className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
                {t("currencyMismatchWarning", { count: formatNumber(card.currencyMismatchCount), currency: card.currency })}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/80 bg-[#0A0F19] p-4">
        {pending && statementId && (
          <FooterButton variant="primary" className="flex-1" onClick={() => router.push(`/finance/statements/${statementId}`)}>
            {t("registerPayment")}
          </FooterButton>
        )}
        <FooterButton className={pending && statementId ? "" : "flex-1"} onClick={onEdit}>
          {t("edit")}
        </FooterButton>
        {card.isActive ? (
          <FooterButton variant="danger" className={pending && statementId ? "" : "flex-1"} onClick={onDeactivate}>
            {t("deactivate")}
          </FooterButton>
        ) : (
          <FooterButton className="flex-1" onClick={onReactivate}>
            {t("reactivate")}
          </FooterButton>
        )}
        {menuItems.length > 0 && (
          <Dropdown menu={{ items: menuItems, onClick: onMenuClick }} trigger={["click"]} placement="topRight">
            <button
              type="button"
              className="ml-auto cursor-pointer rounded-xl bg-slate-800/80 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
              aria-label={t("moreActionsForCard", { card: `${card.bank} ${card.name}` })}
              aria-haspopup="menu"
            >
              <span aria-hidden="true" className="block text-base leading-none">⋮</span>
            </button>
          </Dropdown>
        )}
      </div>
    </div>
  );
}
