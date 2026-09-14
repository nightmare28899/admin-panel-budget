"use client";
import { Form, Input, List, Popconfirm } from "antd";
import { useState } from "react";
import type { Category, CategoryWritePayload } from "./finance.types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/i18n/LocaleProvider";

export function CategoryManager({ categories, onCreate, onUpdate, onDelete }: { categories: Category[]; onCreate: (body: CategoryWritePayload) => void; onUpdate: (id: string, body: CategoryWritePayload) => void; onDelete: (id: string) => void }) {
  const { t, formatNumber } = useLocale();
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Category>(); const [form] = Form.useForm<CategoryWritePayload>();
  const submit = (values: CategoryWritePayload) => { if (editing) onUpdate(editing.id, values); else onCreate(values); setOpen(false); form.resetFields(); setEditing(undefined); };
  const closeModal = () => { setOpen(false); form.resetFields(); setEditing(undefined); };
  return <section>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-[var(--text-1)]">{t("categoryList")}</h2>
      <Button type="button" variant="tinted" onClick={() => setOpen(true)}>{t("addCategory")}</Button>
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
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(category);
                form.setFieldsValue({ name: category.name, icon: category.icon ?? undefined, color: category.color ?? undefined, budgetAmount: category.budgetAmount ?? undefined });
                setOpen(true);
              }}
            >
               {t("edit")}
            </Button>,
            <Popconfirm key="delete" title={t("deleteCategoryQuestion")} okButtonProps={{ danger: true, shape: "round" }} cancelButtonProps={{ shape: "round" }} onConfirm={() => onDelete(category.id)}>
              <Button type="button" variant="danger" size="sm">{t("delete")}</Button>
            </Popconfirm>,
          ]}
        >
          <List.Item.Meta
            title={
              <span className="inline-flex items-center gap-2 text-[var(--text-1)]">
                {category.icon} {category.name}
                {category.color && (
                  <span
                    aria-label={t("categoryColor", { color: category.color })}
                    title={category.color}
                    className="inline-block h-3 w-3 shrink-0 rounded-full border border-[var(--border-soft)]"
                    style={{ backgroundColor: category.color }}
                  />
                )}
              </span>
            }
            description={<span className="text-[var(--text-3)]">{category.budgetAmount != null ? t("categoryBudget", { amount: formatNumber(category.budgetAmount) }) : t("noCategoryBudget")}</span>}
          />
        </List.Item>
      )}
    />
    <Modal open={open} onClose={closeModal} title={editing ? t("editCategory") : t("newCategory")}>
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="name" label={t("name")} rules={[{ required: true }]}><Input maxLength={60} placeholder={t("groceriesExample")} /></Form.Item>
        <Form.Item name="icon" label={t("icon")}><Input maxLength={20} placeholder={t("categoryIconExample")} /></Form.Item>
        <Form.Item name="color" label={t("color")}><Input placeholder="#2563eb" /></Form.Item>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={closeModal}>{t("cancel")}</Button>
          <Button type="submit" variant="primary">{t("save")}</Button>
        </div>
      </Form>
    </Modal>
  </section>;
}
