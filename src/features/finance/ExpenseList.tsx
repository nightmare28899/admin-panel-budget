"use client";

import { Empty, Popconfirm, Table } from "antd";
import type { Expense } from "./finance.types";
import { formatCalendarDate } from "./finance.types";
import { Button } from "@/components/ui/Button";

// Soft "glass" pill for the Category column — swaps antd's raw hex-filled
// <Tag> (opaque, clashes with the dark theme) for a token-driven pill that
// matches the dim-background/matching-text pattern already used across the
// app (see Card/Modal). Categories cycle across the emerald/gold/rose/info
// pairs by a stable hash of their id so the same category always lands on
// the same color; no category (or an unmapped one) falls back to a neutral
// bg-3/text-2 pill instead of guessing a color.
const CATEGORY_PILL_TOKENS = [
  { bg: "var(--emerald-dim)", text: "var(--emerald-text)" },
  { bg: "var(--gold-dim)", text: "var(--gold-text)" },
  { bg: "var(--rose-dim)", text: "var(--rose-text)" },
  { bg: "var(--info-dim)", text: "var(--info-text)" },
] as const;

function hashToIndex(value: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

function CategoryPill({ category }: { category: Expense["category"] }) {
  if (!category) {
    return <span className="text-[var(--text-3)]">—</span>;
  }

  const { bg, text } = CATEGORY_PILL_TOKENS[hashToIndex(category.id ?? category.name, CATEGORY_PILL_TOKENS.length)];

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: bg, color: text }}
    >
      {category.name}
    </span>
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
// scrollbar on top of the table's own internal scroll — measured live against
// this table's actual row height (~54px), not the previous fixed 15-row guess.
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
  return (
    <>
      <Table
        rowKey="id"
        scroll={{ x: "max-content", y: VISIBLE_ROWS_HEIGHT }}
        locale={{ emptyText: <Empty description="No expenses match filters" /> }}
        dataSource={expenses}
        pagination={{
          current: page,
          total,
          pageSize,
          onChange: onPage,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          onShowSizeChange: (_current, size) => onPageSizeChange(size),
          showTotal: (totalCount) => `Total ${totalCount} record${totalCount === 1 ? "" : "s"}`,
          position: ["bottomCenter"],
        }}
        columns={[
          { title: "Date", dataIndex: "date", render: (value: string) => <span className="font-mono text-[13px] text-[var(--text-2)]">{formatCalendarDate(value)}</span> },
          { title: "Expense", dataIndex: "title", render: (value: string, row: Expense) => <><strong className="text-[var(--text-1)]">{value}</strong>{row.merchantName && <div className="text-xs text-[var(--text-3)]">{row.merchantName}</div>}</> },
          { title: "Category", render: (_: unknown, row: Expense) => <CategoryPill category={row.category} /> },
          { title: "Amount", render: (_: unknown, row: Expense) => <span className="font-mono tabular-nums text-[var(--text-1)]">{row.currency} {Number(row.cost).toFixed(2)}</span> },
          { title: "Actions", render: (_: unknown, row: Expense) => <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => onEdit(row)}>Edit</Button>{row.imageUrl && <Button type="button" variant="outline" size="sm" onClick={() => onReceipt(row)} aria-label={`View receipt for ${row.title}`}>Receipt</Button>}<Popconfirm title="Delete expense?" okButtonProps={{ danger: true, shape: "round" }} cancelButtonProps={{ shape: "round" }} onConfirm={() => onDelete(row.id)}><Button type="button" variant="danger" size="sm">Delete</Button></Popconfirm></div> },
        ]}
      />
    </>
  );
}
