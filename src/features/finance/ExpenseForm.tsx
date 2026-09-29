"use client";

import { Form, Input, Select, Upload } from "antd";
import { useState } from "react";
import type { Category, Expense, ExpenseWritePayload } from "./finance.types";
import { toCalendarDate } from "./finance.types";
import type { CreditCardSummary } from "./statement-import.types";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";

const PAYMENT_METHOD_LABEL_KEYS = {
  CASH: "cash",
  CREDIT_CARD: "creditCard",
  DEBIT_CARD: "debitCard",
  TRANSFER: "transfer",
} as const;
const PAYMENT_METHOD_VALUES = Object.keys(PAYMENT_METHOD_LABEL_KEYS) as Array<keyof typeof PAYMENT_METHOD_LABEL_KEYS>;

export function ExpenseForm({ categories, creditCards = [], expense, loading, error, onSubmit, onCancel }: { categories: Category[]; creditCards?: CreditCardSummary[]; expense?: Expense; loading?: boolean; error?: string; onSubmit: (values: ExpenseWritePayload, receipt?: File) => void; onCancel: () => void }) {
  const { t } = useLocale();
  const [form] = Form.useForm<ExpenseWritePayload>(); const [receipt, setReceipt] = useState<File>();
  const watchedPaymentMethod = Form.useWatch("paymentMethod", form) ?? expense?.paymentMethod ?? "CASH";
  return <Form form={form} layout="vertical" initialValues={expense ? { ...expense, cost: String(expense.cost), categoryId: expense.categoryId ?? expense.category?.id, date: toCalendarDate(expense.date), paymentMethod: expense.paymentMethod ?? "CASH", creditCardId: expense.creditCardId ?? undefined } : { currency: "MXN", paymentMethod: "CASH" }} onFinish={(values) => onSubmit(values, receipt)}>
    {error && <div role="alert" className="mb-4 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]">{error}</div>}
    <Form.Item name="title" label={t("title")} rules={[{ required: true, whitespace: true }]}><Input maxLength={120} placeholder={t("groceryShoppingExample")} /></Form.Item>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Form.Item name="cost" label={t("amount")} rules={[{ required: true }]}><Input inputMode="decimal" placeholder="0.00" /></Form.Item><Form.Item name="currency" label={t("currency")} rules={[{ required: true, len: 3 }]}><Input maxLength={3} placeholder="MXN" /></Form.Item></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Form.Item name="date" label={t("date")}><Input type="date" /></Form.Item><Form.Item name="categoryId" label={t("category")} rules={[{ required: true }]}><Select placeholder={t("selectCategory")} options={categories.map((category) => ({ value: category.id, label: `${category.icon ?? ""} ${category.name}` }))} /></Form.Item></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Form.Item name="paymentMethod" label={t("paymentMethodLabel")} rules={[{ required: true }]}>
        <Select options={PAYMENT_METHOD_VALUES.map((method) => ({ value: method, label: t(PAYMENT_METHOD_LABEL_KEYS[method]) }))} onChange={(value) => { if (value !== "CREDIT_CARD") form.setFieldValue("creditCardId", undefined); }} />
      </Form.Item>
      {watchedPaymentMethod === "CREDIT_CARD" && (
        <Form.Item name="creditCardId" label={t("creditCard")} rules={[{ required: true, message: t("creditCardRequiredForMethod") }]}>
          <Select
            placeholder={t("selectCard")}
            options={creditCards.map((card) => ({ value: card.id, label: `${card.name} •••• ${card.last4}` }))}
            notFoundContent={t("noActiveCards")}
          />
        </Form.Item>
      )}
    </div>
    <Form.Item name="merchantName" label={t("merchant")}><Input maxLength={120} placeholder={t("merchantExample")} /></Form.Item><Form.Item name="locationLabel" label={t("location")}><Input maxLength={120} placeholder={t("locationExample")} /></Form.Item><Form.Item name="note" label={t("note")}><Input.TextArea rows={3} maxLength={1000} placeholder={t("notePlaceholder")} /></Form.Item>
    {!expense && <Form.Item label={t("receiptOptional")}><Upload disabled={loading} beforeUpload={(file) => { if (file.size > 5 * 1024 * 1024) return Upload.LIST_IGNORE; setReceipt(file); return false; }} maxCount={1} accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"><Button type="button" variant="outline" size="sm" disabled={loading}>{t("chooseImage")}</Button></Upload></Form.Item>}
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" disabled={loading} onClick={onCancel}>{t("cancel")}</Button>
      <Button type="submit" variant="primary" loading={loading}>{loading ? t("saving") : expense ? t("saveChanges") : t("createExpense")}</Button>
    </div>
  </Form>;
}
