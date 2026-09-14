"use client";

import { Form, Input, Select, Upload } from "antd";
import { useState } from "react";
import type { Category, Expense, ExpenseWritePayload } from "./finance.types";
import { toCalendarDate } from "./finance.types";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";

export function ExpenseForm({ categories, expense, loading, onSubmit, onCancel }: { categories: Category[]; expense?: Expense; loading?: boolean; onSubmit: (values: ExpenseWritePayload, receipt?: File) => void; onCancel: () => void }) {
  const { t } = useLocale();
  const [form] = Form.useForm<ExpenseWritePayload>(); const [receipt, setReceipt] = useState<File>();
  return <Form form={form} layout="vertical" initialValues={expense ? { ...expense, cost: String(expense.cost), categoryId: expense.categoryId ?? expense.category?.id, date: toCalendarDate(expense.date) } : { currency: "MXN" }} onFinish={(values) => onSubmit(values, receipt)}>
    <Form.Item name="title" label={t("title")} rules={[{ required: true, whitespace: true }]}><Input maxLength={120} placeholder={t("groceryShoppingExample")} /></Form.Item>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Form.Item name="cost" label={t("amount")} rules={[{ required: true }]}><Input inputMode="decimal" placeholder="0.00" /></Form.Item><Form.Item name="currency" label={t("currency")} rules={[{ required: true, len: 3 }]}><Input maxLength={3} placeholder="MXN" /></Form.Item></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Form.Item name="date" label={t("date")}><Input type="date" /></Form.Item><Form.Item name="categoryId" label={t("category")} rules={[{ required: true }]}><Select placeholder={t("selectCategory")} options={categories.map((category) => ({ value: category.id, label: `${category.icon ?? ""} ${category.name}` }))} /></Form.Item></div>
    <Form.Item name="merchantName" label={t("merchant")}><Input maxLength={120} placeholder={t("merchantExample")} /></Form.Item><Form.Item name="locationLabel" label={t("location")}><Input maxLength={120} placeholder={t("locationExample")} /></Form.Item><Form.Item name="note" label={t("note")}><Input.TextArea rows={3} maxLength={1000} placeholder={t("notePlaceholder")} /></Form.Item>
    {!expense && <Form.Item label={t("receiptOptional")}><Upload beforeUpload={(file) => { if (file.size > 5 * 1024 * 1024) return Upload.LIST_IGNORE; setReceipt(file); return false; }} maxCount={1} accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"><Button type="button" variant="outline" size="sm">{t("chooseImage")}</Button></Upload></Form.Item>}
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onCancel}>{t("cancel")}</Button>
      <Button type="submit" variant="primary" disabled={loading}>{loading ? t("saving") : expense ? t("saveChanges") : t("createExpense")}</Button>
    </div>
  </Form>;
}
