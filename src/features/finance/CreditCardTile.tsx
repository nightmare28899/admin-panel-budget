"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, type ButtonHTMLAttributes } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import { creditCardTheme } from "./creditCardVisuals";
import { CreditCardFace } from "./CreditCardFace";
import { cardPaymentDate } from "./cardPaymentAlerts";
import { daysUntilDueDate } from "./cardPaymentSchedule";
import { getCutoffPaymentState } from "./cardCutoffStatus";
import { CutoffStatusChip, useCutoffAgo } from "./CutoffStatusChip";
import type { CreditCardOverviewItem } from "./credit-cards.types";
import { CreditCardInstallmentPlans } from "./CreditCardInstallmentPlans";
import { CardStatementPayments } from "./CardStatementPayments";

type Tone = "emerald" | "gold" | "rose";

function usageTone(card: CreditCardOverviewItem): Tone {
  if (card.flags.overLimit) return "rose";
  if (card.flags.highUtilization) return "gold";
  return "emerald";
}

const WARNING_BADGE_CLASS: Record<Exclude<Tone, "emerald">, string> = {
  gold: "border-amber-500/20 bg-amber-500/10 text-[var(--gold-text)]",
  rose: "border-rose-500/20 bg-rose-500/10 text-[var(--rose-text)]",
};

const WARNING_BAR_CLASS: Record<Exclude<Tone, "emerald">, string> = {
  gold: "bg-gradient-to-r from-amber-500 to-amber-400",
  rose: "bg-gradient-to-r from-rose-500 to-rose-400",
};

function Row({
  label,
  valueClassName = "text-[var(--text-2)]",
  children,
}: {
  label: string;
  valueClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border-soft)]/60 py-1.5 text-xs last:border-b-0">
      <span className="text-[var(--text-3)]">{label}</span>
      <span className={`text-right font-mono font-medium ${valueClassName}`}>{children}</span>
    </div>
  );
}

type FooterVariant = "neutral" | "danger" | "primary";

const FOOTER_BUTTON_CLASS: Record<FooterVariant, string> = {
  neutral: "bg-[var(--bg-3)]/90 text-[var(--text-2)] hover:bg-[var(--bg-3)]",
  danger: "border border-rose-500/20 bg-rose-500/10 text-[var(--rose-text)] hover:bg-rose-500/20",
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
  hideFace = false,
  wide = false,
  onToggleDetails,
  onEdit,
  onDeactivate,
  onReactivate,
  onDeletePermanently,
  onStatementPaymentChanged,
}: {
  card: CreditCardOverviewItem;
  detailsExpanded: boolean;
  /** The card face is rendered elsewhere (stacked view). */
  hideFace?: boolean;
  /** Full-width layout: debt and statement on the left, cutoff and payment schedule on the right (lg and up). */
  wide?: boolean;
  onToggleDetails: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDeletePermanently: () => void;
  onStatementPaymentChanged: (notice?: string) => void | Promise<void>;
}) {
  const router = useRouter();
  const { t, formatNumber, formatDate } = useLocale();
  const formatMoney = (value: number) => `${card.currency} ${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const theme = creditCardTheme(card);
  const tone = usageTone(card);
  const summary = card.statementSummary;
  const statementPaymentStatus = summary.paymentStatus;
  const statementId = summary.statementImportId;
  const cutoff = getCutoffPaymentState(card);
  const needsStatement = card.isActive && cutoff.status === "CUTOFF_NEEDS_STATEMENT";
  const cutoffAgo = useCutoffAgo();
  // Payment pending = the latest statement still asks for money. A cutoff without a statement has no amount.
  const pending = card.isActive && cutoff.pending && !needsStatement;
  const paymentDate = cardPaymentDate(card);
  const daysUntilDue = paymentDate.kind === "statement" ? daysUntilDueDate(paymentDate.date) : null;
  const overdue = daysUntilDue !== null && daysUntilDue < 0;
  const detailsId = useId();
  const detailsToggleId = `credit-card-details-toggle-${detailsId}`;
  const detailsRegionId = `credit-card-details-${detailsId}`;
  const utilization = Math.min(100, Math.max(0, card.creditStatus.utilizationPercent ?? 0));
  const paymentAmount = summary.currentPaymentDue ?? summary.noInterestTarget;

  const emphasisClass = !pending ? "" : overdue ? "ring-1 ring-rose-500/30" : "ring-1 ring-amber-500/20";

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
    <div className={`flex flex-col overflow-hidden rounded-3xl border border-[var(--border-soft)]/90 bg-[var(--bg-1)] transition-all duration-300 hover:border-[var(--border-soft)] hover:shadow-2xl ${emphasisClass} ${card.isActive ? "" : "opacity-60"}`}>
      {!hideFace && <CreditCardFace card={card} className="m-3" />}
      {hideFace && (
        <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
          <h3 className="truncate text-base font-bold tracking-tight text-[var(--text-1)]">{card.name}</h3>
          <span className="shrink-0 font-mono text-xs text-[var(--text-3)]">{card.bank} •••• {card.last4}</span>
        </div>
      )}

      <div className={`flex-1 space-y-3 px-4 pb-4 ${hideFace ? "pt-3" : ""}`}>
        <div className={`grid gap-3 ${wide ? "lg:grid-cols-2 lg:gap-x-8" : ""}`}>
        <div className="space-y-3">
        {card.creditStatus.limit != null ? (
          <div>
            <div className="flex items-center justify-between text-xs text-[var(--text-3)]">
              <span className="font-medium">{t("projectedDebt")}</span>
              <span className={`rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${tone === "emerald" ? theme.badgeClass : WARNING_BADGE_CLASS[tone]}`}>
                {t("percentUsed", { percent: formatNumber(card.creditStatus.utilizationPercent ?? 0) })}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono text-sm">
              <p className="font-bold tabular-nums text-[var(--text-1)]">
                {formatMoney(card.creditStatus.owedBalance)}
              </p>
              <p className="text-right text-xs text-[var(--text-3)]">
                {t("limitLabel")} {formatMoney(card.creditStatus.limit)}
              </p>
            </div>
            <div
              role="progressbar"
              aria-label={t("utilization")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(utilization)}
              className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-3)]"
            >
              <div className={`h-2 rounded-full ${tone === "emerald" ? theme.barClass : WARNING_BAR_CLASS[tone]}`} style={{ width: `${utilization}%` }} />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-[var(--text-3)]">{t("projectedDebt")}</p>
            <p className="mt-1 font-mono text-sm font-bold tabular-nums text-[var(--text-1)]">
              {formatMoney(card.creditStatus.owedBalance)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-3)]">{t("noCreditLimit")}</p>
          </div>
        )}

        {statementId ? (
          <div
            className={`rounded-xl border p-3.5 text-xs ${
              pending
                ? overdue
                  ? "border-rose-500/25 bg-rose-500/5"
                  : "border-amber-500/25 bg-amber-500/5"
                : "border-[var(--border-soft)] bg-[var(--bg-3)]/80"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-[var(--text-3)]">{t("latestStatement")}</p>
              <p className="mt-0.5 font-mono font-medium text-[var(--text-2)]">
                {summary.periodStart ? formatDate(summary.periodStart, { dateStyle: "medium" }) : "—"}
                {" – "}
                {summary.periodEnd ? formatDate(summary.periodEnd, { dateStyle: "medium" }) : "—"}
              </p>
            </div>
            {statementPaymentStatus === "PAID" ? (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-[var(--emerald-text)]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {t("paid")}
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-[var(--gold-text)]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-400 motion-safe:animate-pulse" />
                {statementPaymentStatus === "PARTIAL" ? t("partial") : t("pending")}
              </span>
            )}
            </div>
            <CardStatementPayments card={card} onChanged={onStatementPaymentChanged} />
          </div>
        ) : (
          <p className="text-xs text-[var(--text-3)]">{t("noStatementAvailable")}</p>
        )}
        </div>

        <div className="space-y-3">
        {card.isActive && (
          <div
            data-testid="cutoff-info"
            className={`rounded-xl border p-3.5 text-xs ${
              needsStatement ? "border-sky-500/25 bg-sky-500/5" : "border-[var(--border-soft)] bg-[var(--bg-3)]/80"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-[var(--text-3)]">{t("lastCutoff")}</p>
              <CutoffStatusChip status={cutoff.status} />
            </div>
            {cutoff.status === "NO_CUTOFF_CONFIGURED" ? (
              <p className="mt-1 text-[var(--text-3)]">{t("setClosingDayHelp")}</p>
            ) : (
              <>
                <p className="mt-0.5 font-mono font-medium text-[var(--text-2)]">
                  {cutoff.lastCutoffDate ? formatDate(cutoff.lastCutoffDate, { dateStyle: "medium" }) : "—"}
                  {cutoff.daysSinceCutoff !== null && <span className="font-sans text-[10px] text-[var(--text-3)]"> · {cutoffAgo(cutoff.daysSinceCutoff)}</span>}
                </p>
                <Row label={t("nextCutoff")}>
                  {cutoff.nextCutoffDate ? formatDate(cutoff.nextCutoffDate, { dateStyle: "medium" }) : "—"}
                  {card.schedule.daysUntilClosing != null && card.schedule.daysUntilClosing >= 0 && (
                    <span className="font-sans text-[10px] text-[var(--text-3)]"> · {dueDistance(card.schedule.daysUntilClosing)}</span>
                  )}
                </Row>
              </>
            )}
            {needsStatement && (
              <div className="mt-2 space-y-2">
                <p className="text-[var(--text-3)]">
                  {t("cutoffNeedsStatementHelp", { date: cutoff.lastCutoffDate ? formatDate(cutoff.lastCutoffDate, { dateStyle: "medium" }) : "—" })}
                </p>
                {cutoff.cycleSpendReference != null && cutoff.cycleSpendReference > 0 && (
                  <p className="text-[11px] text-[var(--text-3)]">
                    {t("cycleSpendReference")}: <span className="font-mono text-[var(--text-2)]">{formatMoney(cutoff.cycleSpendReference)}</span>
                  </p>
                )}
                <Link
                  href="/finance/statements"
                  className="inline-block rounded-lg border border-sky-500/30 bg-sky-500/15 px-3 py-1.5 font-semibold text-[var(--info-text)] transition hover:bg-sky-500/25 focus-visible:outline-2 focus-visible:outline-sky-400"
                >
                  {t("uploadStatement")}
                </Link>
              </div>
            )}
          </div>
        )}

        {pending ? (
          <div>
            {paymentAmount != null && (
              <div
                role="status"
                className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs ${
                  overdue ? "bg-rose-500/5 text-[var(--rose-text)]" : "bg-amber-500/5 text-[var(--gold-text)]"
                }`}
              >
                <span className="flex items-center gap-1 font-medium">
                  <span aria-hidden="true" className={overdue ? "text-[var(--rose-text)]" : "text-[var(--gold-text)]"}>⚠</span>
                  {t("noInterestPayment")}
                </span>
                <span className="font-mono font-bold">{formatMoney(paymentAmount)}</span>
              </div>
            )}
          </div>
        ) : needsStatement ? null : (
          <Row label={t("currentPaymentDue")} valueClassName="font-semibold text-[var(--emerald-text)]">
            {summary.currentPaymentDue == null ? "—" : formatMoney(summary.currentPaymentDue)}
          </Row>
        )}

        <Row
          label={t(paymentDate.kind === "scheduled" ? "scheduledPaymentDate" : "paymentDeadline")}
          valueClassName={paymentDate.kind === "statement" && pending ? "font-semibold text-[var(--rose-text)]" : "text-[var(--text-2)]"}
        >
          {paymentDate.kind === "missing" ? t("paymentDateNotConfigured") : (
            <>
              {formatDate(paymentDate.date, { dateStyle: "medium" })}
              {daysUntilDue !== null && <> ({dueDistance(daysUntilDue)})</>}
            </>
          )}
        </Row>
        {paymentDate.kind === "scheduled" && (
          <p className="text-[11px] text-[var(--text-3)]">{t("scheduledPaymentDateHelp")}</p>
        )}

        <CreditCardInstallmentPlans plans={card.installmentPlans ?? []} currency={card.currency} />
        </div>
        </div>

        <button
          type="button"
          id={detailsToggleId}
          aria-expanded={detailsExpanded}
          aria-controls={detailsRegionId}
          onClick={onToggleDetails}
          className="cursor-pointer rounded-lg px-1 py-1 text-xs font-medium text-[var(--text-3)] transition hover:text-[var(--text-2)] focus-visible:outline-2 focus-visible:outline-sky-400"
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
                <span className="font-sans text-[10px] text-[var(--text-3)]"> · {formatDate(summary.projectedNextCloseDate, { dateStyle: "medium" })}</span>
              )}
            </Row>
            <Row label={t("nextClosePaymentEstimate")}>
              {formatMoney(summary.nextClosePaymentEstimate)}
            </Row>
            <Row label={t("remainingAfterNextClose")}>
              {formatMoney(summary.estimatedRemainingAfterNextClose)}
            </Row>

            {card.flags.currencyMismatch && (
              <p role="status" className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-[var(--gold-text)]">
                {t("currencyMismatchWarning", { count: formatNumber(card.currencyMismatchCount), currency: card.currency })}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-soft)]/80 bg-[var(--bg-1)] p-4">
        <FooterButton className="flex-1" onClick={onEdit}>
          {t("edit")}
        </FooterButton>
        {card.isActive ? (
          <FooterButton variant="danger" className="flex-1" onClick={onDeactivate}>
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
              className="ml-auto cursor-pointer rounded-xl bg-[var(--bg-3)]/80 p-2 text-[var(--text-3)] transition hover:bg-[var(--bg-3)] hover:text-[var(--text-1)] focus-visible:outline-2 focus-visible:outline-sky-400"
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
