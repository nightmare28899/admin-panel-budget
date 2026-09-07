"use client";

import { Button, Empty, Popconfirm, Table, Tag } from "antd";
import type { Expense } from "./finance.types";
import { formatCalendarDate } from "./finance.types";

type Props = { expenses: Expense[]; loading: boolean; page: number; total: number; onPage: (page: number) => void; onEdit: (expense: Expense) => void; onDelete: (id: string) => void; onReceipt: (expense: Expense) => void };
export function ExpenseList({ expenses, loading, page, total, onPage, onEdit, onDelete, onReceipt }: Props) {
  return <Table rowKey="id" loading={loading} locale={{ emptyText: <Empty description="No expenses match filters" /> }} dataSource={expenses} pagination={{ current: page, total, pageSize: 20, onChange: onPage, showSizeChanger: false }} columns={[
    { title: "Date", dataIndex: "date", render: (value: string) => formatCalendarDate(value) },
    { title: "Expense", dataIndex: "title", render: (value: string, row: Expense) => <><strong>{value}</strong>{row.merchantName && <div className="text-xs text-slate-400">{row.merchantName}</div>}</> },
    { title: "Category", render: (_: unknown, row: Expense) => row.category ? <Tag color={row.category.color ?? undefined}>{row.category.name}</Tag> : "—" },
    { title: "Amount", render: (_: unknown, row: Expense) => `${row.currency} ${row.cost}` },
    { title: "Actions", render: (_: unknown, row: Expense) => <div className="flex gap-2"><Button size="small" onClick={() => onEdit(row)}>Edit</Button>{row.imageUrl && <Button size="small" onClick={() => onReceipt(row)} aria-label={`View receipt for ${row.title}`}>Receipt</Button>}<Popconfirm title="Delete expense?" onConfirm={() => onDelete(row.id)}><Button danger size="small">Delete</Button></Popconfirm></div> },
  ]} />;
}
