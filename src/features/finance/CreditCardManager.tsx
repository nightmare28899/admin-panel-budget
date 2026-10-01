"use client";

import { Form, Input, InputNumber } from "antd";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CreditCardTile } from "./CreditCardTile";
import type {
  CreditCardOverviewItem,
  CreditCardOverviewResponse,
  CreditCardWritePayload,
} from "./credit-cards.types";
import { useLocale } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import { listPendingPayments } from "./cardPaymentSchedule";
import { PaymentReminderBanner } from "./PaymentReminderBanner";

type FilterTab = "all" | "active" | "inactive";

export function CreditCardManager({
  overview,
  onCreate,
  onUpdate,
  onDeactivate,
  onReactivate,
  notice,
}: {
  overview: CreditCardOverviewResponse;
  onCreate: (body: CreditCardWritePayload) => Promise<void>;
  onUpdate: (id: string, body: Partial<CreditCardWritePayload>) => Promise<void>;
  onDeactivate: (id: string) => Promise<void>;
  onReactivate: (id: string) => Promise<void>;
  /** Rendered between the page header and the KPI row (e.g. an error alert). */
  notice?: ReactNode;
}) {
  const { t, formatNumber, formatDate } = useLocale();
  const formatMoney = (value: number, currency: string) => `${currency} ${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const filterLabels: Record<FilterTab, string> = { all: t("all"), active: t("active"), inactive: t("inactive") };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCardOverviewItem>();
  const [saving, setSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<CreditCardOverviewItem>();
  const [deactivating, setDeactivating] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("active");
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(() => new Set());
  const [form] = Form.useForm<CreditCardWritePayload>();

  const { portfolio, cards } = overview;
  const activeCards = cards.filter((card) => card.isActive);
  const inactiveCount = cards.length - activeCards.length;
  const filterCounts: Record<FilterTab, number> = { all: cards.length, active: activeCards.length, inactive: inactiveCount };
  const totalTransactions = activeCards.reduce((sum, card) => sum + card.currentCycle.expenseCount, 0);
  const pendingPayments = listPendingPayments(cards);
  const activePercent = portfolio.trackedCards > 0
    ? Math.round((portfolio.activeCards / portfolio.trackedCards) * 100)
    : null;

  const visibleCards = cards.filter((card) => {
    if (filter === "active") return card.isActive;
    if (filter === "inactive") return !card.isActive;
    return true;
  });
  const allVisibleDetailsExpanded = visibleCards.length > 0
    && visibleCards.every((card) => expandedCardIds.has(card.id));

  const toggleCardDetails = (cardId: string) => {
    setExpandedCardIds((current) => {
      const next = new Set(current);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const toggleAllVisibleDetails = () => {
    setExpandedCardIds((current) => {
      const next = new Set(current);
      visibleCards.forEach((card) => {
        if (allVisibleDetailsExpanded) next.delete(card.id);
        else next.add(card.id);
      });
      return next;
    });
  };

  const closeModal = () => {
    setOpen(false);
    form.resetFields();
    setEditing(undefined);
  };

  const submit = async (values: CreditCardWritePayload) => {
    setSaving(true);
    if (editing) await onUpdate(editing.id, values);
    else await onCreate(values);
    setSaving(false);
    closeModal();
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    await onDeactivate(deactivateTarget.id);
    setDeactivating(false);
    setDeactivateTarget(undefined);
  };

  const sectionTitle: Record<FilterTab, MessageKey> = {
    active: "cardsSectionActive",
    all: "cardsSectionAll",
    inactive: "cardsSectionInactive",
  };

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">{t("myCards")}</h1>
            <span className="rounded-full border border-[var(--border-soft)] bg-[var(--bg-3)] px-2.5 py-0.5 text-xs text-[var(--text-2)]">
              {t("activeCardsCount", { count: formatNumber(activeCards.length) })}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[var(--text-3)]">{t("trackCardsDescription")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={t("myCards")} className="flex gap-1 rounded-full border border-[var(--border-soft)] p-1">
            {(["active", "all", "inactive"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                aria-pressed={filter === tab}
                onClick={() => setFilter(tab)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filter === tab
                    ? "border-[var(--emerald)]/30 bg-[var(--emerald-dim)] text-[var(--emerald-text)] hover:border-[var(--emerald)]/50 hover:bg-[var(--emerald)]/25 active:bg-[var(--emerald)]/35"
                    : "border-transparent text-[var(--text-3)] hover:border-[var(--emerald)]/30 hover:bg-[var(--emerald-dim)] hover:text-[var(--emerald-text)]"
                }`}
              >
                {filterLabels[tab]} ({formatNumber(filterCounts[tab])})
              </button>
            ))}
          </div>
          {visibleCards.length > 0 && (
            <Button type="button" variant="outline" aria-pressed={allVisibleDetailsExpanded} onClick={toggleAllVisibleDetails}>
              {allVisibleDetailsExpanded ? t("hideAllDetails") : t("showAllDetails")}
            </Button>
          )}
          <Button type="button" variant="tinted" onClick={() => setOpen(true)}>
            {t("addCard")}
          </Button>
        </div>
      </div>

      {notice}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="info"
          icon="💳"
          label={t("totalCards")}
          value={String(portfolio.activeCards)}
          extraPlacement="below"
          extra={
            <div className="space-y-1 text-xs text-[var(--text-3)]">
              <p>
                {activePercent !== null && <span className="text-[var(--emerald-text)]">{t("activePercent", { percent: formatNumber(activePercent) })} · </span>}
                {t("trackedCards", { count: formatNumber(portfolio.trackedCards) })}
              </p>
              {portfolio.byCurrency.filter((summary) => summary.totalCreditLimit > 0).map((summary) => (
                <p key={summary.currency} className="flex justify-between gap-2 border-t border-[var(--border-soft)] pt-1">
                  <span>{t("totalCapacity")}</span>
                  <span className="font-mono text-[var(--text-1)]">{formatMoney(summary.totalCreditLimit, summary.currency)}</span>
                </p>
              ))}
            </div>
          }
        />
        {portfolio.byCurrency.map((summary) => (
          <StatCard
            key={summary.currency}
            tone="gold"
            icon="📈"
            label={t("spentThisCycle")}
            unit={summary.currency}
            value={formatNumber(summary.totalCurrentCycleSpend, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            extraPlacement="below"
            extra={
              <div className="space-y-1.5 text-xs text-[var(--text-3)]">
                <p className="flex justify-between gap-2 border-t border-[var(--border-soft)] pt-1.5">
                  <span>{t("availableCredit")}</span>
                  <span className="font-mono text-[var(--text-1)]">{formatMoney(summary.totalAvailableCredit, summary.currency)}</span>
                </p>
                {summary.utilizationPercent !== null && (
                  <div
                    role="progressbar"
                    aria-label={`${t("utilization")} ${summary.currency}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(Math.min(100, Math.max(0, summary.utilizationPercent)))}
                    className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-3)]"
                  >
                    <div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${Math.min(100, Math.max(0, summary.utilizationPercent))}%` }} />
                  </div>
                )}
              </div>
            }
          />
        ))}
        {portfolio.byCurrency.map((summary) => {
          const items = pendingPayments.filter((item) => item.card.currency === summary.currency);
          const total = items.reduce((sum, item) => sum + (item.card.statementSummary.currentPaymentDue ?? 0), 0);
          const nearest = items.find((item) => item.dueDate !== null)?.dueDate ?? null;
          return (
            <StatCard
              key={`statement-payments-${summary.currency}`}
              tone="rose"
              icon="🧾"
              label={t("pendingStatementPayments")}
              unit={summary.currency}
              value={formatNumber(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              extraPlacement="below"
              extra={
                items.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-soft)] pt-1.5 text-xs text-[var(--text-3)]">
                    <span>{nearest ? t("nextPaymentOn", { date: formatDate(nearest, { dateStyle: "medium" }) }) : ""}</span>
                    <span className="rounded-md bg-[var(--rose-dim)] px-2 py-0.5 text-[var(--rose-text)]">
                      {t("paymentsToSettle", { count: formatNumber(items.length) })}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--text-3)]">{t("noPendingPayments")}</span>
                )
              }
            />
          );
        })}
        <StatCard
          tone="emerald"
          icon="⚡"
          label={t("transactions")}
          value={String(totalTransactions)}
          extraPlacement="below"
          extra={<span className="text-xs text-[var(--text-3)]">{t("thisCycle")} · {t("activeCycle")}</span>}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-[var(--text-1)]">
          {t(sectionTitle[filter])}{" "}
          <span className="font-mono text-xs font-normal text-[var(--text-3)]">
            ({visibleCards.length === 1 ? t("cardUnitsOne") : t("cardUnits", { count: formatNumber(visibleCards.length) })})
          </span>
        </h2>
        <p className="text-xs text-[var(--text-3)]">{t("projectedFiguresNote")}</p>
      </div>

      {visibleCards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-soft)] px-4 py-8 text-center">
          <p className="text-sm font-medium text-[var(--text-2)]">{t("noCardsShow")}</p>
          <p className="mt-1 text-xs text-[var(--text-3)]">
            {filter === "active" ? t("addFirstCard") : t("tryAnotherFilter")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCards.map((card) => (
            <CreditCardTile
              key={card.id}
              card={card}
              detailsExpanded={expandedCardIds.has(card.id)}
              onToggleDetails={() => toggleCardDetails(card.id)}
              onEdit={() => {
                setEditing(card);
                form.setFieldsValue({
                  name: card.name,
                  bank: card.bank,
                  brand: card.brand,
                  last4: card.last4,
                  color: card.color ?? undefined,
                  creditLimit: card.creditLimit ?? undefined,
                  closingDay: card.closingDay ?? undefined,
                  paymentDueDay: card.paymentDueDay ?? undefined,
                  currency: card.currency,
                });
                setOpen(true);
              }}
              onDeactivate={() => setDeactivateTarget(card)}
              onReactivate={() => void onReactivate(card.id)}
            />
          ))}
        </div>
      )}

      <PaymentReminderBanner cards={cards} />

      <Modal open={open} onClose={closeModal} title={editing ? t("editCard") : t("addCard")}>
        <Form form={form} layout="vertical" initialValues={{ currency: "MXN" }} onFinish={(values) => void submit(values)}>
          <Form.Item name="name" label={t("cardName")} rules={[{ required: true }]}>
            <Input maxLength={80} placeholder={t("rewardsExample")} />
          </Form.Item>
          <Form.Item name="bank" label={t("bank")} rules={[{ required: true }]}>
            <Input maxLength={80} placeholder={t("bankExample")} />
          </Form.Item>
          <Form.Item name="brand" label={t("brand")} rules={[{ required: true }]}>
            <Input maxLength={30} placeholder={t("brandExample")} />
          </Form.Item>
          <Form.Item
            name="last4"
            label={t("last4")}
            rules={[{ required: true }, { pattern: /^\d{4}$/, message: t("exactly4Digits") }]}
          >
            <Input maxLength={4} placeholder="1234" />
          </Form.Item>
          <Form.Item
            name="currency"
            label={t("currency")}
            normalize={(value: string) => value.trim().toUpperCase()}
            rules={[
              { required: true },
              { pattern: /^[A-Z]{3}$/, message: t("currencyCodeRequired") },
            ]}
          >
            <Input maxLength={3} placeholder="MXN" className="uppercase" />
          </Form.Item>
          <Form.Item
            name="color"
            label={t("colorOptional")}
            rules={[{ pattern: /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, message: t("hexColor") }]}
          >
            <Input placeholder="#7C3AED" />
          </Form.Item>
          <Form.Item name="creditLimit" label={t("creditLimitOptional")}>
            <InputNumber min={0} className="w-full" placeholder="25000" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="closingDay" label={t("closingDayOptional")}>
              <InputNumber min={1} max={31} className="w-full" placeholder="25" />
            </Form.Item>
            <Form.Item name="paymentDueDay" label={t("paymentDueDayOptional")}>
              <InputNumber min={1} max={31} className="w-full" placeholder="12" />
            </Form.Item>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {t("save")}
            </Button>
          </div>
        </Form>
      </Modal>

      <ConfirmModal
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(undefined)}
        onConfirm={confirmDeactivate}
        title={t("deactivateCardQuestion")}
        description={
          deactivateTarget
            ? t("deactivateCardDescription", { bank: deactivateTarget.bank, name: deactivateTarget.name })
            : undefined
        }
        confirmLabel={t("deactivate")}
        confirmingLabel={t("deactivating")}
        confirmVariant="danger"
        loading={deactivating}
      />
    </section>
  );
}
