"use client";

import { Form, Input, InputNumber } from "antd";
import { useState } from "react";
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

type FilterTab = "all" | "active" | "inactive";

export function CreditCardManager({
  overview,
  onCreate,
  onUpdate,
  onDeactivate,
  onReactivate,
}: {
  overview: CreditCardOverviewResponse;
  onCreate: (body: CreditCardWritePayload) => Promise<void>;
  onUpdate: (id: string, body: Partial<CreditCardWritePayload>) => Promise<void>;
  onDeactivate: (id: string) => Promise<void>;
  onReactivate: (id: string) => Promise<void>;
}) {
  const { t, formatNumber } = useLocale();
  const formatMoney = (value: number) => `MXN ${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const filterLabels: Record<FilterTab, string> = { all: t("all"), active: t("active"), inactive: t("inactive") };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCardOverviewItem>();
  const [saving, setSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<CreditCardOverviewItem>();
  const [deactivating, setDeactivating] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("active");
  const [form] = Form.useForm<CreditCardWritePayload>();

  const { portfolio, cards } = overview;
  const totalTransactions = cards.reduce((sum, card) => sum + card.currentCycle.expenseCount, 0);

  const visibleCards = cards.filter((card) => {
    if (filter === "active") return card.isActive;
    if (filter === "inactive") return !card.isActive;
    return true;
  });

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

  return (
    <section>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="info"
          icon="💳"
          label={t("totalCards")}
          value={String(portfolio.activeCards)}
          extra={<span className="text-xs text-[var(--text-3)]">{t("trackedCards", { count: formatNumber(portfolio.trackedCards) })}</span>}
        />
        <StatCard
          tone="gold"
          icon="📈"
          label={t("spentThisCycle")}
          value={formatMoney(portfolio.totalCurrentCycleSpend)}
          extra={
            portfolio.totalCreditLimit > 0 ? (
              <span className="text-xs text-[var(--text-3)]">{t("limitAmount", { amount: formatMoney(portfolio.totalCreditLimit) })}</span>
            ) : undefined
          }
        />
        <StatCard
          tone="emerald"
          icon="🛡️"
          label={t("availableCredit")}
          value={formatMoney(portfolio.totalAvailableCredit)}
          extra={<span className="text-xs text-[var(--text-3)]">{t("ofAmount", { amount: formatMoney(portfolio.totalCreditLimit) })}</span>}
        />
        <StatCard
          tone="rose"
          icon="⚡"
          label={t("transactions")}
          value={String(totalTransactions)}
          extra={<span className="text-xs text-[var(--text-3)]">{t("thisCycle")}</span>}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 rounded-full border border-[var(--border-soft)] p-1">
          {(["active", "all", "inactive"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === tab
                  ? "border-[var(--emerald)]/30 bg-[var(--emerald-dim)] text-[var(--emerald-text)] hover:border-[var(--emerald)]/50 hover:bg-[var(--emerald)]/25 active:bg-[var(--emerald)]/35"
                  : "border-transparent text-[var(--text-3)] hover:border-[var(--emerald)]/30 hover:bg-[var(--emerald-dim)] hover:text-[var(--emerald-text)]"
              }`}
            >
              {filterLabels[tab]}
            </button>
          ))}
        </div>
        <Button type="button" variant="tinted" onClick={() => setOpen(true)}>
          {t("addCard")}
        </Button>
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
                });
                setOpen(true);
              }}
              onDeactivate={() => setDeactivateTarget(card)}
              onReactivate={() => void onReactivate(card.id)}
            />
          ))}
        </div>
      )}

      <Modal open={open} onClose={closeModal} title={editing ? t("editCard") : t("addCard")}>
        <Form form={form} layout="vertical" onFinish={(values) => void submit(values)}>
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
