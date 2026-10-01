"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useLocale } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import {
  creditCardArtworkBackground,
  CreditCardBrandMark,
  CreditCardChipIcon,
  CreditCardContactlessIcon,
} from "./creditCardVisuals";
import { daysUntilDueDate, hasPaymentPending } from "./cardPaymentSchedule";
import type { CreditCardOverviewItem } from "./credit-cards.types";

type Tone = "emerald" | "gold" | "rose";

function usageTone(card: CreditCardOverviewItem): Tone {
  if (card.flags.overLimit) return "rose";
  if (card.flags.highUtilization) return "gold";
  return "emerald";
}

const USAGE_BADGE_CLASS: Record<Tone, string> = {
  emerald: "bg-[var(--emerald-dim)] text-[var(--emerald-text)]",
  gold: "bg-[var(--gold-dim)] text-[var(--gold-text)]",
  rose: "bg-[var(--rose-dim)] text-[var(--rose-text)]",
};

const USAGE_BAR_CLASS: Record<Tone, string> = {
  emerald: "bg-[var(--emerald)]",
  gold: "bg-[var(--gold)]",
  rose: "bg-[var(--rose)]",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border-soft)] py-1.5 text-xs text-[var(--text-3)] last:border-b-0">
      <span>{label}</span>
      <span className="text-right font-mono text-[var(--text-1)]">{children}</span>
    </div>
  );
}

export function CreditCardTile({
  card,
  detailsExpanded,
  onToggleDetails,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  card: CreditCardOverviewItem;
  detailsExpanded: boolean;
  onToggleDetails: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  const router = useRouter();
  const { t, formatNumber, formatDate } = useLocale();
  const formatMoney = (value: number) => `${card.currency} ${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const background = creditCardArtworkBackground(card);
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

  const emphasisClass = !pending
    ? "border-[var(--border-soft)]"
    : overdue
      ? "border-[var(--rose)]/60 shadow-[0_0_0_1px_var(--rose-dim),0_8px_30px_rgba(0,0,0,0.35)]"
      : "border-[var(--gold)]/60 shadow-[0_0_0_1px_var(--gold-dim),0_8px_30px_rgba(0,0,0,0.35)]";

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
    ...(statementId
      ? [{ key: "statement", label: t("viewStatement") }]
      : []),
    { key: "details", label: detailsExpanded ? t("hideDetails") : t("showDetails") },
  ];
  const onMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "statement" && statementId) router.push(`/finance/statements/${statementId}`);
    if (key === "details") onToggleDetails();
  };

  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border bg-[var(--bg-2)]/60 ${emphasisClass} ${card.isActive ? "" : "opacity-60"}`}>
      <div
        style={{ background }}
        className="relative m-3 flex h-44 flex-col justify-between overflow-hidden rounded-xl p-4"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/30" />

        <div className="relative flex items-start justify-between">
          <span className="truncate text-sm font-extrabold uppercase tracking-wider text-white/95">
            {card.bank}
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
          <CreditCardChipIcon />
          <p className="mt-2 font-mono text-[15px] tracking-[0.15em] text-white drop-shadow-sm">
            •••• •••• •••• {card.last4}
          </p>
        </div>

        <div className="relative flex items-end justify-between gap-2">
          <span className="truncate text-xs font-medium uppercase tracking-wide text-white/85">{card.name}</span>
          {card.brand && <CreditCardBrandMark brand={card.brand} />}
        </div>
      </div>

      <div className="flex-1 space-y-3 px-4 pb-4">
        {card.creditStatus.limit != null ? (
          <div>
            <div className="flex items-center justify-between text-xs text-[var(--text-3)]">
              <span>{t("projectedDebt")}</span>
              <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${USAGE_BADGE_CLASS[tone]}`}>
                {t("percentUsed", { percent: formatNumber(card.creditStatus.utilizationPercent ?? 0) })}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <p className="font-mono text-lg font-medium tabular-nums text-[var(--text-1)]">
                {formatMoney(card.creditStatus.owedBalance)}
              </p>
              <p className="text-right font-mono text-[11px] text-[var(--text-3)]">
                {t("limitLabel")} {formatMoney(card.creditStatus.limit)}
              </p>
            </div>
            <div
              role="progressbar"
              aria-label={t("utilization")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(utilization)}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-3)]"
            >
              <div className={`h-full rounded-full ${USAGE_BAR_CLASS[tone]}`} style={{ width: `${utilization}%` }} />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-[var(--text-3)]">{t("projectedDebt")}</p>
            <p className="mt-1 font-mono text-lg font-medium tabular-nums text-[var(--text-1)]">
              {formatMoney(card.creditStatus.owedBalance)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-3)]">{t("noCreditLimit")}</p>
          </div>
        )}

        {statementId ? (
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-xs text-[var(--text-3)] ${
              pending ? (overdue ? "border-[var(--rose)]/40" : "border-[var(--gold)]/40") : "border-[var(--border-soft)]"
            }`}
          >
            <div className="min-w-0">
              <p>{t("latestStatement")}</p>
              <p className="mt-1 font-mono text-[var(--text-1)]">
                {summary.periodStart ? formatDate(summary.periodStart, { dateStyle: "medium" }) : "—"}
                {" – "}
                {summary.periodEnd ? formatDate(summary.periodEnd, { dateStyle: "medium" }) : "—"}
              </p>
            </div>
            <Badge variant={statementPaymentStatus === "PAID" ? "success" : statementPaymentStatus === "PARTIAL" ? "warning" : "neutral"} className="shrink-0">
              {statementPaymentStatus === "PAID" ? t("paid") : statementPaymentStatus === "PARTIAL" ? t("partial") : t("pending")}
            </Badge>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-3)]">{t("noStatementAvailable")}</p>
        )}

        {pending ? (
          <div>
            {paymentAmount != null && (
              <div
                role="status"
                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-medium ${
                  overdue ? "bg-[var(--rose-dim)] text-[var(--rose-text)]" : "bg-[var(--gold-dim)] text-[var(--gold-text)]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true">⚠</span>
                  {t("noInterestPayment")}
                </span>
                <span className="font-mono">{formatMoney(paymentAmount)}</span>
              </div>
            )}
            {summary.dueDate && (
              <Row label={t("paymentDeadline")}>
                <span className={overdue ? "text-[var(--rose-text)]" : daysUntilDue !== null && daysUntilDue <= 3 ? "text-[var(--gold-text)]" : ""}>
                  {formatDate(summary.dueDate, { dateStyle: "medium" })}
                  {daysUntilDue !== null && <> ({dueDistance(daysUntilDue)})</>}
                </span>
              </Row>
            )}
          </div>
        ) : (
          <Row label={t("currentPaymentDue")}>
            {summary.currentPaymentDue == null ? "—" : formatMoney(summary.currentPaymentDue)}
          </Row>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          id={detailsToggleId}
          aria-expanded={detailsExpanded}
          aria-controls={detailsRegionId}
          onClick={onToggleDetails}
        >
          {detailsExpanded ? t("hideDetails") : t("showDetails")}
        </Button>

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
              {summary.projectedNextCloseDate && <> · {formatDate(summary.projectedNextCloseDate, { dateStyle: "medium" })}</>}
            </Row>
            <Row label={t("nextClosePaymentEstimate")}>
              {formatMoney(summary.nextClosePaymentEstimate)}
            </Row>
            <Row label={t("remainingAfterNextClose")}>
              {formatMoney(summary.estimatedRemainingAfterNextClose)}
            </Row>

            {card.flags.currencyMismatch && (
              <p role="status" className="mt-2 rounded-lg border border-[var(--gold)]/25 bg-[var(--gold-dim)] px-3 py-2 text-xs text-[var(--gold-text)]">
                {t("currencyMismatchWarning", { count: formatNumber(card.currencyMismatchCount), currency: card.currency })}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-soft)] px-4 py-3">
        {pending && statementId && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => router.push(`/finance/statements/${statementId}`)}
          >
            {t("registerPayment")}
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          {t("edit")}
        </Button>
        {card.isActive ? (
          <Button type="button" variant="danger" size="sm" onClick={onDeactivate}>
            {t("deactivate")}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onReactivate}>
            {t("reactivate")}
          </Button>
        )}
        <Dropdown menu={{ items: menuItems, onClick: onMenuClick }} trigger={["click"]} placement="topRight">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto !px-2"
            aria-label={t("moreActionsForCard", { card: `${card.bank} ${card.name}` })}
            aria-haspopup="menu"
          >
            <span aria-hidden="true" className="text-base leading-none">⋮</span>
          </Button>
        </Dropdown>
      </div>
    </div>
  );
}
