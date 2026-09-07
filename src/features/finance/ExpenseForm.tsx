"use client";

import { Button, Form, Input, Select, Upload } from "antd";
import { useState } from "react";
import type { Category, Expense, ExpenseWritePayload } from "./finance.types";
import { toCalendarDate } from "./finance.types";

export function ExpenseForm({ categories, expense, loading, onSubmit, onCancel }: { categories: Category[]; expense?: Expense; loading?: boolean; onSubmit: (values: ExpenseWritePayload, receipt?: File) => void; onCancel: () => void }) {
  const [form] = Form.useForm<ExpenseWritePayload>(); const [receipt, setReceipt] = useState<File>();
  return <Form form={form} layout="vertical" initialValues={expense ? { ...expense, cost: String(expense.cost), categoryId: expense.categoryId ?? expense.category?.id, date: toCalendarDate(expense.date) } : { currency: "MXN" }} onFinish={(values) => onSubmit(values, receipt)}>
    <Form.Item name="title" label="Title" rules={[{ required: true, whitespace: true }]}><Input maxLength={120} /></Form.Item>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Form.Item name="cost" label="Amount" rules={[{ required: true }]}><Input inputMode="decimal" /></Form.Item><Form.Item name="currency" label="Currency" rules={[{ required: true, len: 3 }]}><Input maxLength={3} /></Form.Item></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Form.Item name="date" label="Date"><Input type="date" /></Form.Item><Form.Item name="categoryId" label="Category" rules={[{ required: true }]}><Select options={categories.map((category) => ({ value: category.id, label: `${category.icon ?? ""} ${category.name}` }))} /></Form.Item></div>
    <Form.Item name="merchantName" label="Merchant"><Input maxLength={120} /></Form.Item><Form.Item name="locationLabel" label="Location"><Input maxLength={120} /></Form.Item><Form.Item name="note" label="Note"><Input.TextArea rows={3} maxLength={1000} /></Form.Item>
    {!expense && <Form.Item label="Receipt (optional, max 5 MB)"><Upload beforeUpload={(file) => { if (file.size > 5 * 1024 * 1024) return Upload.LIST_IGNORE; setReceipt(file); return false; }} maxCount={1} accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"><Button>Choose image</Button></Upload></Form.Item>}
    <div className="flex justify-end gap-2"><Button onClick={onCancel}>Cancel</Button><Button type="primary" htmlType="submit" loading={loading}>{expense ? "Save changes" : "Create expense"}</Button></div>
  </Form>;
}
