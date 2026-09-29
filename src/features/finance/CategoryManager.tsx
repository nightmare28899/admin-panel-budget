"use client";
import { Form, Input, List, Popconfirm } from "antd";
import { useState } from "react";
import type { Category, CategoryWritePayload } from "./finance.types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/i18n/LocaleProvider";

export function CategoryManager({ categories, onCreate, onUpdate, onDelete, deletingCategoryId }: { categories: Category[]; onCreate: (body: CategoryWritePayload) => Promise<boolean>; onUpdate: (id: string, body: CategoryWritePayload) => Promise<boolean>; onDelete: (id: string) => void; deletingCategoryId?: string }) {
  const { t, formatNumber } = useLocale();
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Category>(); const [saving, setSaving] = useState(false); const [form] = Form.useForm<CategoryWritePayload>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(categories.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageSizeOptions = [10, 20, 50].map((size) => ({
    value: size,
    label: t("rowsPerPageOption", { count: formatNumber(size) }),
  }));
  const submit = async (values: CategoryWritePayload) => {
    if (saving) return;

    setSaving(true);
    try {
      const saved = editing
        ? await onUpdate(editing.id, values)
        : await onCreate(values);
      if (!saved) return;

      setOpen(false);
      form.resetFields();
      setEditing(undefined);
    } finally {
      setSaving(false);
    }
  };
  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    form.resetFields();
    setEditing(undefined);
  };
  return <section>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-[var(--text-1)]">{t("categoryList")}</h2>
      <Button type="button" variant="tinted" onClick={() => setOpen(true)}>{t("addCategory")}</Button>
    </div>
    <List
      bordered
      dataSource={categories}
      rowKey="id"
      pagination={{
        current: currentPage,
        pageSize,
        pageSizeOptions: [10, 20, 50],
        responsive: true,
        showLessItems: true,
        showSizeChanger: {
          "aria-label": t("rowsPerPage"),
          options: pageSizeOptions,
        },
        showTotal: (total, [start, end]) => t("showingRecords", {
          start: formatNumber(start),
          end: formatNumber(end),
          total: formatNumber(total),
          records: t(total === 1 ? "category" : "categories"),
        }),
        className: "flex-wrap gap-y-2",
        onChange: (nextPage, nextPageSize) => {
          if (nextPageSize !== pageSize) {
            setPageSize(nextPageSize);
            setPage(1);
            return;
          }

          setPage(nextPage);
        },
      }}
      renderItem={(category) => {
        const usage = category.usage;
        const isInUse = usage
          ? usage.expenseCount + usage.subscriptionCount + usage.statementRowCount > 0
          : false;
        const isDeleting = deletingCategoryId === category.id;
        const deletionPending = deletingCategoryId !== undefined;
        const actions = [
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
        ];

        if (usage && !isInUse) {
          actions.push(
            <Popconfirm
              key="delete"
              title={t("deleteCategoryQuestion")}
              description={t("deleteCategoryDescription")}
              okButtonProps={{ danger: true, shape: "round", loading: isDeleting, disabled: deletionPending }}
              cancelButtonProps={{ shape: "round" }}
              onConfirm={() => onDelete(category.id)}
            >
              <Button type="button" variant="danger" size="sm" disabled={deletionPending}>{t("delete")}</Button>
            </Popconfirm>,
          );
        }

        return (
          <List.Item actions={actions}>
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
              description={
                <span className="flex flex-col gap-1 text-xs text-[var(--text-3)]">
                  {category.budgetAmount != null && category.budgetAmount > 0 && (
                    <span>{t("categoryBudget", { amount: formatNumber(category.budgetAmount) })}</span>
                  )}
                  {usage ? <span>{t("categoryUsage", usage)}</span> : (
                    <span className="text-[var(--gold-text)]">{t("categoryUsageUnavailable")}</span>
                  )}
                  {usage && isInUse && (
                    <span className="text-[var(--gold-text)]">{t("categoryDeleteBlocked")}</span>
                  )}
                </span>
              }
            />
          </List.Item>
        );
      }}
    />
    <Modal open={open} onClose={closeModal} title={editing ? t("editCategory") : t("newCategory")}>
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="name" label={t("name")} rules={[{ required: true }]}><Input maxLength={60} placeholder={t("groceriesExample")} /></Form.Item>
        <Form.Item name="icon" label={t("icon")}><Input maxLength={20} placeholder={t("categoryIconExample")} /></Form.Item>
        <Form.Item name="color" label={t("color")}><Input placeholder="#2563eb" /></Form.Item>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={saving} onClick={closeModal}>{t("cancel")}</Button>
          <Button type="submit" variant="primary" loading={saving}>{t("save")}</Button>
        </div>
      </Form>
    </Modal>
  </section>;
}
