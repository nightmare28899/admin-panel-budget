"use client";

import { Form, Input, InputNumber } from "antd";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CardKpiTile } from "./CardKpiTile";
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
  onDeletePermanently,
  notice,
}: {
  overview: CreditCardOverviewResponse;
  onCreate: (body: CreditCardWritePayload) => Promise<void>;
  onUpdate: (id: string, body: Partial<CreditCardWritePayload>) => Promise<void>;
  onDeactivate: (id: string) => Promise<void>;
  onReactivate: (id: string) => Promise<void>;
  onDeletePermanently: (id: string) => Promise<void>;
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
  const [deleteTarget, setDeleteTarget] = useState<CreditCardOverviewItem>();
  const [deleting, setDeleting] = useState(false);
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

  const confirmDeletePermanently = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await onDeletePermanently(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(undefined);
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
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-white">{t("myCards")}</h1>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
              {t("activeCardsCount", { count: formatNumber(activeCards.length) })}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-400">{t("trackCardsDescription")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label={t("myCards")} className="inline-flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
            {(["active", "all", "inactive"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                aria-pressed={filter === tab}
                onClick={() => setFilter(tab)}
                className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs transition focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                  filter === tab
                    ? "bg-emerald-500 font-semibold text-slate-950 shadow-sm"
                    : "font-medium text-slate-400 hover:text-slate-200"
                }`}
              >
                {filterLabels[tab]} ({formatNumber(filterCounts[tab])})
              </button>
            ))}
          </div>
          {visibleCards.length > 0 && (
            <button
              type="button"
              aria-pressed={allVisibleDetailsExpanded}
              onClick={toggleAllVisibleDetails}
              className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800/80 focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              {allVisibleDetailsExpanded ? t("hideAllDetails") : t("showAllDetails")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-teal-400 active:scale-95 focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            {t("addCard")}
          </button>
        </div>
      </div>

      {notice}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardKpiTile
          accent="teal"
          size="lg"
          label={t("totalCards")}
          value={String(portfolio.activeCards)}
          aside={
            activePercent !== null ? (
              <span className="text-xs font-medium text-emerald-400">{t("activePercent", { percent: formatNumber(activePercent) })}</span>
            ) : null
          }
        >
          <div className="mt-4 space-y-1 border-t border-slate-800/60 pt-3 text-xs text-slate-400">
            <p>{t("trackedCards", { count: formatNumber(portfolio.trackedCards) })}</p>
            {portfolio.byCurrency.filter((summary) => summary.totalCreditLimit > 0).map((summary) => (
              <p key={summary.currency} className="flex justify-between gap-2">
                <span>{t("totalCapacity")}</span>
                <span className="font-mono font-semibold text-slate-200">{formatMoney(summary.totalCreditLimit, summary.currency)}</span>
              </p>
            ))}
          </div>
        </CardKpiTile>
        {portfolio.byCurrency.map((summary) => (
          <CardKpiTile
            key={summary.currency}
            accent="amber"
            label={t("spentThisCycle")}
            unit={summary.currency}
            value={formatNumber(summary.totalCurrentCycleSpend, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          >
            <div className="mt-3">
              <div className="mb-1 flex justify-between gap-2 text-[11px] text-slate-400">
                <span>{t("availableCredit")}</span>
                <span className="font-mono font-medium text-slate-300">{formatMoney(summary.totalAvailableCredit, summary.currency)}</span>
              </div>
              {summary.utilizationPercent !== null && (
                <div
                  role="progressbar"
                  aria-label={`${t("utilization")} ${summary.currency}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(Math.min(100, Math.max(0, summary.utilizationPercent)))}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
                >
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                    style={{ width: `${Math.min(100, Math.max(0, summary.utilizationPercent))}%` }}
                  />
                </div>
              )}
            </div>
          </CardKpiTile>
        ))}
        {portfolio.byCurrency.map((summary) => {
          const items = pendingPayments.filter((item) => item.card.currency === summary.currency);
          const total = items.reduce((sum, item) => sum + (item.card.statementSummary.currentPaymentDue ?? 0), 0);
          const nearest = items.find((item) => item.dueDate !== null)?.dueDate ?? null;
          return (
            <CardKpiTile
              key={`statement-payments-${summary.currency}`}
              accent="rose"
              label={t("pendingStatementPayments")}
              unit={summary.currency}
              value={formatNumber(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            >
              {items.length > 0 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/60 pt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-medium text-rose-400/90">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rose-400 motion-safe:animate-ping" />
                    {nearest ? t("nextPaymentOn", { date: formatDate(nearest, { dateStyle: "medium" }) }) : ""}
                  </span>
                  <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-400">
                    {t("paymentsToSettle", { count: formatNumber(items.length) })}
                  </span>
                </div>
              ) : (
                <p className="mt-4 border-t border-slate-800/60 pt-3 text-xs text-slate-400">{t("noPendingPayments")}</p>
              )}
            </CardKpiTile>
          );
        })}
        <CardKpiTile accent="indigo" size="lg" label={t("transactions")} value={String(totalTransactions)}>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/60 pt-3 text-xs">
            <span className="font-medium text-emerald-400">{t("thisCycle")}</span>
            <span className="text-slate-400">{t("activeCycle")}</span>
          </div>
        </CardKpiTile>
      </div>

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight text-white">
          {t(sectionTitle[filter])}{" "}
          <span className="font-mono text-xs font-normal text-slate-400">
            ({visibleCards.length === 1 ? t("cardUnitsOne") : t("cardUnits", { count: formatNumber(visibleCards.length) })})
          </span>
        </h2>
        <p className="text-xs text-slate-400">{t("projectedFiguresNote")}</p>
      </div>

      {visibleCards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-300">{t("noCardsShow")}</p>
          <p className="mt-1 text-xs text-slate-400">
            {filter === "active" ? t("addFirstCard") : t("tryAnotherFilter")}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              onDeletePermanently={() => setDeleteTarget(card)}
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

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={confirmDeletePermanently}
        title={t("deleteCardPermanentlyQuestion")}
        description={
          deleteTarget
            ? t("deleteCardPermanentlyDescription", { bank: deleteTarget.bank, name: deleteTarget.name })
            : undefined
        }
        confirmLabel={t("deletePermanently")}
        confirmingLabel={t("deletingPermanently")}
        confirmVariant="danger"
        loading={deleting}
      />
    </section>
  );
}
