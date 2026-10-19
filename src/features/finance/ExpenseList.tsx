"use client";

import Link from "next/link";
import { Empty, List, Popconfirm } from "antd";
import { CreditCardOutlined, DeleteOutlined, EditOutlined, PictureOutlined } from "@ant-design/icons";
import type { Expense } from "./finance.types";
import { toCalendarDate } from "./finance.types";
import { categoryTokens } from "./categoryVisuals";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InstallmentPlanBadge } from "./InstallmentPlanBadge";
import { useLocale } from "@/i18n/LocaleProvider";
import { buildPagination } from "@/lib/pagination";

function TransactionRow({
  expense,
  onEdit,
  onDelete,
  onReceipt,
  deletingExpenseId,
}: {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => Promise<void>;
  onReceipt: (expense: Expense) => void;
  deletingExpenseId?: string;
}) {
  const { t, formatDate, formatNumber } = useLocale();
  const { bg, text, icon } = categoryTokens(expense.category);
  const FallbackIcon = icon.kind === "component" ? icon.component : undefined;
  const calendarDate = toCalendarDate(expense.date);
  const displayDate = calendarDate
    ? formatDate(`${calendarDate}T12:00:00`, { year: "numeric", month: "short", day: "numeric" })
    : "—";
  const isInstallmentRow = expense.isInstallment === true && (expense.installmentCount ?? 0) > 1;
  const hasFinancingPlan = !isInstallmentRow && Boolean(expense.financingPlan);
  const isDeleting = deletingExpenseId === expense.id;
  const deletionPending = deletingExpenseId !== undefined;

  return (
    <List.Item className="!items-center !justify-between !gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg"
          style={{ background: bg, color: text }}
        >
          {icon.kind === "glyph" ? icon.glyph : FallbackIcon && <FallbackIcon />}
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
          {(expense.creditCard || expense.statementRow || isInstallmentRow || hasFinancingPlan) && (
            <p className="mt-1 flex flex-wrap items-center gap-1.5">
              {isInstallmentRow && (
                <Badge variant="neutral">{t("installmentBadge", { index: formatNumber(expense.installmentIndex ?? 1), count: formatNumber(expense.installmentCount ?? 0) })}</Badge>
              )}
              {hasFinancingPlan && <InstallmentPlanBadge expense={expense} />}
              {expense.creditCard && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-3)]/60 px-2 py-0.5 text-[11px] text-[var(--text-3)]">
                  <CreditCardOutlined /> {expense.creditCard.name} •••• {expense.creditCard.last4}
                </span>
              )}
              {expense.statementRow && (
                <>
                  <Link href={`/finance/statements/${expense.statementRow.statementImportId}`}>
                    <Badge variant={expense.statementRow.statementImport.paymentStatus === "PAID" ? "success" : expense.statementRow.statementImport.paymentStatus === "PARTIAL" ? "warning" : "neutral"}>
                      {expense.statementRow.statementImport.paymentStatus === "PAID"
                        ? t("paid")
                        : expense.statementRow.statementImport.paymentStatus === "PARTIAL"
                          ? t("partial")
                          : t("unpaid")}
                    </Badge>
                  </Link>
                  {expense.statementRow.statementImport.periodStart && expense.statementRow.statementImport.periodEnd && (
                    <span className="text-[11px] text-[var(--text-3)]">
                      {formatDate(expense.statementRow.statementImport.periodStart, { dateStyle: "medium" })}–
                      {formatDate(expense.statementRow.statementImport.periodEnd, { dateStyle: "medium" })}
                    </span>
                  )}
                </>
              )}
            </p>
          )}
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
            okButtonProps={{ danger: true, shape: "round", loading: isDeleting, disabled: deletionPending }}
            cancelButtonProps={{ shape: "round" }}
            onConfirm={() => onDelete(expense.id)}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="!h-7 !px-2 text-[var(--rose)] hover:text-[var(--rose)]"
              disabled={deletionPending}
              aria-label={t("deleteExpenseNamed", { title: expense.title })}
            >
              <DeleteOutlined />
            </Button>
          </Popconfirm>
        </div>
      </div>
    </List.Item>
  );
}

type Props = {
  expenses: Expense[];
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => Promise<void>;
  deletingExpenseId?: string;
  onReceipt: (expense: Expense) => void;
};

export function ExpenseList({
  expenses,
  page,
  pageSize,
  total,
  onPage,
  onPageSizeChange,
  onEdit,
  onDelete,
  deletingExpenseId,
  onReceipt,
}: Props) {
  const { t, formatNumber } = useLocale();

  return (
    <List
      bordered
      dataSource={expenses}
      rowKey="id"
      locale={{ emptyText: <Empty description={t("noExpensesMatch")} className="py-10" /> }}
      pagination={buildPagination({
        t, formatNumber, current: page, pageSize, total,
        recordKeys: { one: "record", other: "records" },
        onChange: (nextPage, nextPageSize) => (nextPageSize !== pageSize ? onPageSizeChange(nextPageSize) : onPage(nextPage)),
      })}
      renderItem={(expense) => (
        <TransactionRow
          expense={expense}
          onEdit={onEdit}
          onDelete={onDelete}
          deletingExpenseId={deletingExpenseId}
          onReceipt={onReceipt}
        />
      )}
    />
  );
}
