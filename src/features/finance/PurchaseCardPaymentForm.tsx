"use client";

import { Alert, Input, InputNumber, Select } from "antd";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";
import type { ConfirmAsPaymentPayload, DetectedPurchase } from "./interfaces/detected-purchases";
import type { CreditCardSummary } from "./statement-import.types";
import { defaultPaymentCardId, detectedPurchasePaymentDefaults, paymentDateToIso } from "./utils/detected-purchases";
import { localToday } from "./statementPaymentRules";

type Props = {
  purchase: DetectedPurchase;
  cards: CreditCardSummary[];
  loading: boolean;
  error?: string;
  errorCode?: string;
  onCancel: () => void;
  onSubmit: (payload: ConfirmAsPaymentPayload) => void | Promise<void>;
};

/** Small form that turns a detected purchase into a payment (abono) to a chosen card. */
export function PurchaseCardPaymentForm({ purchase, cards, loading, error, errorCode, onCancel, onSubmit }: Props) {
  const { t } = useLocale();
  const defaults = detectedPurchasePaymentDefaults(purchase);
  const today = localToday();
  const [cardId, setCardId] = useState(defaultPaymentCardId(cards));
  const [amount, setAmount] = useState<number | null>(Number(defaults.amount));
  const [date, setDate] = useState(defaults.date > today ? today : defaults.date);
  const [note, setNote] = useState("");
  const valid = Boolean(cardId) && amount != null && amount >= 0.01 && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today;
  return <div className="space-y-3">
    <p className="text-sm leading-6 text-[var(--text-2)]">{t("purchasePaymentDescription")}</p>
    <label className="block text-sm">{t("purchasePaymentCard")}
      <Select className="mt-1 w-full" value={cardId || undefined} placeholder={t("selectCard")} onChange={setCardId} disabled={loading}
        options={cards.map((card) => ({ value: card.id, label: `${card.bank} ${card.name} •••• ${card.last4}` }))} />
    </label>
    <label className="block text-sm">{t("purchasePaymentAmount")} ({purchase.currency})
      <InputNumber className="mt-1 w-full" min={0.01} step={0.01} precision={2} value={amount} onChange={setAmount} disabled={loading} />
    </label>
    <label className="block text-sm">{t("purchasePaymentDate")}
      <Input className="mt-1" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} disabled={loading} />
    </label>
    <label className="block text-sm">{t("purchasePaymentNote")}
      <Input.TextArea className="mt-1" maxLength={500} rows={2} value={note} onChange={(event) => setNote(event.target.value)} disabled={loading} />
    </label>
    {error && <Alert type="error" showIcon title={error} action={errorCode === "STATEMENT_REQUIRED" ? <Link className="text-[var(--accent-text)]" href="/finance/statements">{t("purchasePaymentStatementLink")}</Link> : undefined} />}
    <div className="flex justify-end gap-2">
      <Button variant="outline" disabled={loading} onClick={onCancel}>{t("cancel")}</Button>
      <Button loading={loading} disabled={!valid} onClick={() => { if (valid) void onSubmit({ cardId, amount, paidAt: paymentDateToIso(date), ...(note.trim() ? { note: note.trim() } : {}) }); }}>{t("purchasePaymentSubmit")}</Button>
    </div>
  </div>;
}
