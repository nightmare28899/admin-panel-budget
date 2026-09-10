"use client";

import { Empty, Popconfirm, Table, Tag } from "antd";
import type { Expense } from "./finance.types";
import { formatCalendarDate } from "./finance.types";
import { Button } from "@/components/ui/Button";

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
          { title: "Category", render: (_: unknown, row: Expense) => row.category ? <Tag color={row.category.color ?? undefined}>{row.category.name}</Tag> : "—" },
          { title: "Amount", render: (_: unknown, row: Expense) => <span className="font-mono tabular-nums text-[var(--text-1)]">{row.currency} {Number(row.cost).toFixed(2)}</span> },
          { title: "Actions", render: (_: unknown, row: Expense) => <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => onEdit(row)}>Edit</Button>{row.imageUrl && <Button type="button" variant="outline" size="sm" onClick={() => onReceipt(row)} aria-label={`View receipt for ${row.title}`}>Receipt</Button>}<Popconfirm title="Delete expense?" okButtonProps={{ danger: true, shape: "round" }} cancelButtonProps={{ shape: "round" }} onConfirm={() => onDelete(row.id)}><Button type="button" variant="danger" size="sm">Delete</Button></Popconfirm></div> },
        ]}
      />
    </>
  );
}
