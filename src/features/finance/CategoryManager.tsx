"use client";
import { Form, Input, List, Popconfirm } from "antd";
import { useState } from "react";
import type { Category, CategoryWritePayload } from "./finance.types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function CategoryManager({ categories, onCreate, onUpdate, onDelete }: { categories: Category[]; onCreate: (body: CategoryWritePayload) => void; onUpdate: (id: string, body: CategoryWritePayload) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Category>(); const [form] = Form.useForm<CategoryWritePayload>();
  const submit = (values: CategoryWritePayload) => { if (editing) onUpdate(editing.id, values); else onCreate(values); setOpen(false); form.resetFields(); setEditing(undefined); };
  const closeModal = () => { setOpen(false); form.resetFields(); setEditing(undefined); };
  return <section>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-[var(--text-1)]">Category list</h2>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>Add category</Button>
    </div>
    <List
      bordered
      dataSource={categories}
      renderItem={(category) => (
        <List.Item
          actions={[
            <Button
              key="edit"
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(category);
                form.setFieldsValue({ name: category.name, icon: category.icon ?? undefined, color: category.color ?? undefined, budgetAmount: category.budgetAmount ?? undefined });
                setOpen(true);
              }}
            >
              Edit
            </Button>,
            <Popconfirm key="delete" title="Delete category? Expenses must not reference it." onConfirm={() => onDelete(category.id)}>
              <Button type="button" variant="danger" size="sm">Delete</Button>
            </Popconfirm>,
          ]}
        >
          <List.Item.Meta
            title={
              <span className="inline-flex items-center gap-2 text-[var(--text-1)]">
                {category.icon} {category.name}
                {category.color && (
                  <span
                    aria-label={`Category color ${category.color}`}
                    title={category.color}
                    className="inline-block h-3 w-3 shrink-0 rounded-full border border-[var(--border-soft)]"
                    style={{ backgroundColor: category.color }}
                  />
                )}
              </span>
            }
            description={<span className="text-[var(--text-3)]">{category.budgetAmount != null ? `Budget ${category.budgetAmount}` : "No category budget configured"}</span>}
          />
        </List.Item>
      )}
    />
    <Modal open={open} onClose={closeModal} title={editing ? "Edit category" : "New category"}>
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input maxLength={60} placeholder="e.g. Groceries" /></Form.Item>
        <Form.Item name="icon" label="Icon"><Input maxLength={20} placeholder="e.g. 🛒" /></Form.Item>
        <Form.Item name="color" label="Color"><Input placeholder="#2563eb" /></Form.Item>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
          <Button type="submit" variant="primary">Save</Button>
        </div>
      </Form>
    </Modal>
  </section>;
}
