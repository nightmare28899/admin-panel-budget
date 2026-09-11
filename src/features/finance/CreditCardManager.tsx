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

type FilterTab = "all" | "active" | "inactive";

function formatMoney(value: number) {
  return `MXN ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
          label="Total cards"
          value={String(portfolio.activeCards)}
          extra={<span className="text-xs text-[var(--text-3)]">of {portfolio.trackedCards} tracked</span>}
        />
        <StatCard
          tone="gold"
          icon="📈"
          label="Spent this cycle"
          value={formatMoney(portfolio.totalCurrentCycleSpend)}
          extra={
            portfolio.totalCreditLimit > 0 ? (
              <span className="text-xs text-[var(--text-3)]">{formatMoney(portfolio.totalCreditLimit)} limit</span>
            ) : undefined
          }
        />
        <StatCard
          tone="emerald"
          icon="🛡️"
          label="Available credit"
          value={formatMoney(portfolio.totalAvailableCredit)}
          extra={<span className="text-xs text-[var(--text-3)]">of {formatMoney(portfolio.totalCreditLimit)}</span>}
        />
        <StatCard
          tone="rose"
          icon="⚡"
          label="Transactions"
          value={String(totalTransactions)}
          extra={<span className="text-xs text-[var(--text-3)]">This cycle</span>}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 rounded-full border border-[var(--border-soft)] p-1">
          {(["active", "all", "inactive"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filter === tab
                  ? "bg-[var(--emerald)] text-[var(--bg-0)]"
                  : "text-[var(--text-3)] hover:text-[var(--text-2)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <Button type="button" variant="tinted" onClick={() => setOpen(true)}>
          + Add card
        </Button>
      </div>

      {visibleCards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-soft)] px-4 py-8 text-center">
          <p className="text-sm font-medium text-[var(--text-2)]">No cards to show.</p>
          <p className="mt-1 text-xs text-[var(--text-3)]">
            {filter === "active" ? "Add your first card to start tracking it." : "Try another filter."}
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

      <Modal open={open} onClose={closeModal} title={editing ? "Edit card" : "Add card"}>
        <Form form={form} layout="vertical" onFinish={(values) => void submit(values)}>
          <Form.Item name="name" label="Card name" rules={[{ required: true }]}>
            <Input maxLength={80} placeholder="e.g. Rewards" />
          </Form.Item>
          <Form.Item name="bank" label="Bank" rules={[{ required: true }]}>
            <Input maxLength={80} placeholder="e.g. Banamex" />
          </Form.Item>
          <Form.Item name="brand" label="Brand" rules={[{ required: true }]}>
            <Input maxLength={30} placeholder="e.g. Visa" />
          </Form.Item>
          <Form.Item
            name="last4"
            label="Last 4 digits"
            rules={[{ required: true }, { pattern: /^\d{4}$/, message: "Exactly 4 digits" }]}
          >
            <Input maxLength={4} placeholder="1234" />
          </Form.Item>
          <Form.Item
            name="color"
            label="Color (optional)"
            rules={[{ pattern: /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, message: "Hex color like #7C3AED" }]}
          >
            <Input placeholder="#7C3AED" />
          </Form.Item>
          <Form.Item name="creditLimit" label="Credit limit (optional)">
            <InputNumber min={0} className="w-full" placeholder="25000" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="closingDay" label="Closing day (optional)">
              <InputNumber min={1} max={31} className="w-full" placeholder="25" />
            </Form.Item>
            <Form.Item name="paymentDueDay" label="Payment due day (optional)">
              <InputNumber min={1} max={31} className="w-full" placeholder="12" />
            </Form.Item>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Save
            </Button>
          </div>
        </Form>
      </Modal>

      <ConfirmModal
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(undefined)}
        onConfirm={confirmDeactivate}
        title="Deactivate this card?"
        description={
          deactivateTarget
            ? `${deactivateTarget.bank} · ${deactivateTarget.name} will stop appearing as an option for new expenses and statement imports. It stays visible here and can be reactivated anytime.`
            : undefined
        }
        confirmLabel="Deactivate"
        confirmingLabel="Deactivating…"
        confirmVariant="danger"
        loading={deactivating}
      />
    </section>
  );
}
