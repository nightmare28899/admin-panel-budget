"use client";

import { Form, Input, Select, Switch, Upload } from "antd";
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
const INSTALLMENT_MONTH_OPTIONS = [3, 6, 9, 12, 18, 24] as const;
const PAYMENT_METHOD_VALUES = Object.keys(PAYMENT_METHOD_LABEL_KEYS) as Array<keyof typeof PAYMENT_METHOD_LABEL_KEYS>;

type ExpenseFormValues = Omit<ExpenseWritePayload, "isInstallment" | "installmentCount" | "installmentFirstPaymentDate"> & {
  isInstallment?: boolean;
  installmentCount?: number;
  installmentFirstPaymentDate?: string;
};

function todayCalendarDate() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Mirrors the mobile app: `cost` is the TOTAL purchase amount, the purchase date
// is the expense date, and the row date is the first payment date. The API
// expands the purchase into one row per month.
function buildPayload(values: ExpenseFormValues, creating: boolean): ExpenseWritePayload {
  const { isInstallment, installmentCount, installmentFirstPaymentDate, ...rest } = values;
  if (!creating || rest.paymentMethod !== "CREDIT_CARD" || !isInstallment || !installmentCount) return rest;

  const purchaseDate = rest.date || todayCalendarDate();
  const firstPaymentDate = installmentFirstPaymentDate || purchaseDate;
  return {
    ...rest,
    date: firstPaymentDate,
    isInstallment: true,
    installmentCount,
    installmentFrequency: "MONTHLY",
    installmentPurchaseDate: purchaseDate,
    installmentFirstPaymentDate: firstPaymentDate,
  };
}

export function ExpenseForm({ categories, creditCards = [], expense, loading, error, onSubmit, onCancel }: { categories: Category[]; creditCards?: CreditCardSummary[]; expense?: Expense; loading?: boolean; error?: string; onSubmit: (values: ExpenseWritePayload, receipt?: File) => void; onCancel: () => void }) {
  const { t } = useLocale();
  const [form] = Form.useForm<ExpenseFormValues>(); const [receipt, setReceipt] = useState<File>();
  const watchedPaymentMethod = Form.useWatch("paymentMethod", form) ?? expense?.paymentMethod ?? "CASH";
  const watchedIsInstallment = Form.useWatch("isInstallment", form) ?? false;
  const watchedDate = Form.useWatch("date", form);
  // Editing an installment row rewrites the whole purchase, so the amount shown is the purchase total.
  const editingInstallment = expense?.isInstallment === true;
  // The first payment defaults to the expense date until the user picks another one.
  const syncFirstPaymentDate = (nextDate?: string) => {
    if (!form.isFieldTouched("installmentFirstPaymentDate")) form.setFieldValue("installmentFirstPaymentDate", nextDate || todayCalendarDate());
  };
  return <Form form={form} layout="vertical" initialValues={expense ? { ...expense, cost: String(editingInstallment ? (expense.installmentTotalAmount ?? expense.cost) : expense.cost), categoryId: expense.categoryId ?? expense.category?.id, date: toCalendarDate(expense.date), paymentMethod: expense.paymentMethod ?? "CASH", creditCardId: expense.creditCardId ?? undefined } : { currency: "MXN", paymentMethod: "CASH" }} onValuesChange={(changed: Partial<ExpenseFormValues>) => { if (changed.date !== undefined || changed.isInstallment) syncFirstPaymentDate(form.getFieldValue("date") as string | undefined); }} onFinish={(values) => onSubmit(buildPayload(values, !expense), receipt)}>
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
    {editingInstallment && <p role="note" className="mb-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/40 px-3 py-2 text-xs text-[var(--text-3)]">{t("installmentEditNote", { index: expense.installmentIndex ?? 1, count: expense.installmentCount ?? 0 })}</p>}
    {!expense && watchedPaymentMethod === "CREDIT_CARD" && (
      <div className="mb-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/40 p-3">
        <Form.Item name="isInstallment" valuePropName="checked" className="!mb-0" label={t("installmentPurchase")}>
          <Switch />
        </Form.Item>
        {watchedIsInstallment && (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item name="installmentCount" label={t("installmentMonths")} rules={[{ required: true, message: t("installmentMonthsRequired") }]} className="!mb-0">
              <Select placeholder={t("installmentMonths")} options={INSTALLMENT_MONTH_OPTIONS.map((months) => ({ value: months, label: t("installmentMonthsOption", { count: months }) }))} />
            </Form.Item>
            <Form.Item
              name="installmentFirstPaymentDate"
              label={t("installmentFirstPaymentDate")}
              dependencies={["date"]}
              className="!mb-0"
              rules={[{
                validator: (_, value?: string) => {
                  const purchaseDate = watchedDate || todayCalendarDate();
                  return !value || value >= purchaseDate ? Promise.resolve() : Promise.reject(new Error(t("installmentFirstPaymentInvalid")));
                },
              }]}
            >
              <Input type="date" />
            </Form.Item>
            <p className="text-xs text-[var(--text-3)] sm:col-span-2">{t("installmentAmountHint")}</p>
          </div>
        )}
      </div>
    )}
    <Form.Item name="merchantName" label={t("merchant")}><Input maxLength={120} placeholder={t("merchantExample")} /></Form.Item><Form.Item name="locationLabel" label={t("location")}><Input maxLength={120} placeholder={t("locationExample")} /></Form.Item><Form.Item name="note" label={t("note")}><Input.TextArea rows={3} maxLength={1000} placeholder={t("notePlaceholder")} /></Form.Item>
    {!expense && <Form.Item label={t("receiptOptional")}><Upload disabled={loading} beforeUpload={(file) => { if (file.size > 5 * 1024 * 1024) return Upload.LIST_IGNORE; setReceipt(file); return false; }} maxCount={1} accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"><Button type="button" variant="outline" size="sm" disabled={loading}>{t("chooseImage")}</Button></Upload></Form.Item>}
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" disabled={loading} onClick={onCancel}>{t("cancel")}</Button>
      <Button type="submit" variant="primary" loading={loading}>{loading ? t("saving") : expense ? t("saveChanges") : t("createExpense")}</Button>
    </div>
  </Form>;
}
