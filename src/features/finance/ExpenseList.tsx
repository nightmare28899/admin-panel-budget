"use client";

import { Empty, Popconfirm, Select } from "antd";
import { DeleteOutlined, EditOutlined, LeftOutlined, PictureOutlined, RightOutlined } from "@ant-design/icons";
import type { Expense } from "./finance.types";
import { toCalendarDate } from "./finance.types";
import { categoryTokens } from "./categoryVisuals";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";

function TransactionRow({
  expense,
  onEdit,
  onDelete,
  onReceipt,
}: {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onReceipt: (expense: Expense) => void;
}) {
  const { t, formatDate, formatNumber } = useLocale();
  const { bg, text, icon: Icon } = categoryTokens(expense.category);
  const calendarDate = toCalendarDate(expense.date);
  const displayDate = calendarDate
    ? formatDate(`${calendarDate}T12:00:00`, { year: "numeric", month: "short", day: "numeric" })
    : "—";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-[var(--bg-3)]/40 sm:px-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg"
          style={{ background: bg, color: text }}
        >
          <Icon />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-1)]">{expense.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-[var(--text-3)]">
            <span className="font-mono">{displayDate}</span>
            {expense.merchantName && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{expense.merchantName}</span>
              </>
            )}
            {expense.category && (
              <>
                <span aria-hidden="true">·</span>
                <span style={{ color: text }}>{expense.category.name}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="font-mono text-sm font-bold tabular-nums text-[var(--rose-text)]">
          -{expense.currency} {formatNumber(Number(expense.cost), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="!h-7 !px-2"
            onClick={() => onEdit(expense)}
            aria-label={t("editExpenseNamed", { title: expense.title })}
          >
            <EditOutlined />
          </Button>
          {expense.imageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="!h-7 !px-2"
              onClick={() => onReceipt(expense)}
              aria-label={t("viewReceiptNamed", { title: expense.title })}
            >
              <PictureOutlined />
            </Button>
          )}
          <Popconfirm
            title={t("deleteExpenseQuestion")}
            okButtonProps={{ danger: true, shape: "round" }}
            cancelButtonProps={{ shape: "round" }}
            onConfirm={() => onDelete(expense.id)}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="!h-7 !px-2 text-[var(--rose)] hover:text-[var(--rose)]"
              aria-label={t("deleteExpenseNamed", { title: expense.title })}
            >
              <DeleteOutlined />
            </Button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );
}

type Props = {
  expenses: Expense[];
  loadingMore: boolean;
  hasMore: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onLoadMore: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onReceipt: (expense: Expense) => void;
};

// Sized so the whole /finance/expenses page fits close to one MacBook viewport
// (~1512x900 window, ~806px usable height) without stacking an outer page
// scrollbar on top of the list's own internal scroll.
const VISIBLE_ROWS_HEIGHT = 460;

export function ExpenseList({
  expenses,
  page,
  pageSize,
  total,
  onPage,
  onPageSizeChange,
  onEdit,
  onDelete,
  onReceipt,
}: Props) {
  const { t, formatNumber } = useLocale();
  const pageSizeOptions = [10, 20, 50, 100].map((size) => ({ value: size, label: t("rowsPerPageOption", { count: formatNumber(size) }) }));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = startIndex === 0 ? 0 : startIndex + expenses.length - 1;

  return (
    <div>
      <div
        className="divide-y divide-[var(--border)] overflow-y-auto"
        style={{ maxHeight: VISIBLE_ROWS_HEIGHT }}
      >
        {expenses.length === 0 ? (
          <Empty description={t("noExpensesMatch")} className="py-10" />
        ) : (
          expenses.map((expense) => (
            <TransactionRow
              key={expense.id}
              expense={expense}
              onEdit={onEdit}
              onDelete={onDelete}
              onReceipt={onReceipt}
            />
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <span className="text-xs text-[var(--text-3)]">
          {total === 0
            ? t("noRecords")
            : t("showingRecords", { start: formatNumber(startIndex), end: formatNumber(endIndex), total: formatNumber(total), records: t(total === 1 ? "record" : "records") })}
        </span>

        <div className="flex items-center gap-2">
          <Select
            aria-label={t("rowsPerPage")}
            size="small"
            value={pageSize}
            style={{ width: 110 }}
            options={pageSizeOptions}
            onChange={onPageSizeChange}
          />
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="!h-8 !w-8 !px-0"
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
              aria-label={t("previous")}
            >
              <LeftOutlined />
            </Button>
            <span className="px-2 text-xs font-medium text-[var(--text-2)]">
              {t("pageOf", { page: formatNumber(page), total: formatNumber(totalPages) })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="!h-8 !w-8 !px-0"
              disabled={page >= totalPages}
              onClick={() => onPage(page + 1)}
              aria-label={t("next")}
            >
              <RightOutlined />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
