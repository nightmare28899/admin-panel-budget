"use client";

import { DatePicker, Input, Select, Spin } from "antd";
import type { Dayjs } from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseList } from "./ExpenseList";
import type {
  Category,
  Expense,
  ExpenseListResponse,
  ExpenseWritePayload,
  Summary,
} from "./finance.types";
import {
  createExpenseAction,
  deleteExpenseAction,
  getCategoriesAction,
  getExpenseAction,
  getExpensesAction,
  getFinanceSummaryAction,
  getUserMeAction,
  updateExpenseAction,
} from "@/lib/userActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MetricCardsSkeleton, TableSkeleton } from "@/components/ui/ContentSkeleton";
import { Modal } from "@/components/ui/Modal";
import { SubscriptionDueBanner } from "./SubscriptionDueBanner";

function safeReceiptUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function ExpensesView() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary>();
  const [list, setList] = useState<ExpenseListResponse>();
  const [rows, setRows] = useState<Expense[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [filters, setFilters] = useState({
    q: "",
    from: "",
    to: "",
    categoryId: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<Expense>();
  const [saving, setSaving] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>();
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string>();

  const reload = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      const profile = await getUserMeAction();

      if (profile.error || !profile.data?.user?.isActive) {
        router.push("/user-login");
        return;
      }

      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(pageSize),
      });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const [sum, cats, expenses] = await Promise.all([
        getFinanceSummaryAction(),
        getCategoriesAction(),
        getExpensesAction(params.toString()),
      ]);

      if (sum.error || cats.error || expenses.error) {
        setError(sum.error ?? cats.error ?? expenses.error);
      } else {
        setSummary(sum.data);
        setCategories(cats.data ?? []);
        setList(expenses.data);
        setRows(expenses.data?.expenses ?? []);
        setPage(nextPage);
      }
      setLoading(false);
    },
    [filters, pageSize, router],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const loadMore = async () => {
    if (loadingMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);

    const params = new URLSearchParams({ page: String(nextPage), limit: String(pageSize) });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const result = await getExpensesAction(params.toString());
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setRows((current) => [...current, ...result.data!.expenses]);
      setList(result.data);
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  const saveExpense = async (values: ExpenseWritePayload, receipt?: File) => {
    setSaving(true);
    const result = editing
      ? await updateExpenseAction(editing.id, values)
      : await createExpenseAction(values, receipt);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDrawer(false);
    setEditing(undefined);
    void reload(page);
  };

  const openReceipt = async (expense: Expense) => {
    setReceiptError(undefined);
    setReceiptUrl(undefined);
    setReceiptLoading(true);
    const result = await getExpenseAction(expense.id);
    const url = safeReceiptUrl(result.data?.imagePresignedUrl);

    if (url) setReceiptUrl(url);
    else setReceiptError(result.error ?? "Receipt is unavailable.");
    setReceiptLoading(false);
  };

  const refreshAfter = async (result: { error?: string }) => {
    if (result.error) setError(result.error);
    else void reload(page);
  };

  const hasBudgetPeriod = summary?.budgetAmount != null;
  const currencyLabel = summary?.currency || "MXN";
  const spentLabel = "Spent this period";
  const initialLoading = loading && !list;

  return (
    <>
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">Your expenses</h1>
            <p className="mt-0.5 text-sm text-[var(--text-3)]">Live data from your Budget account.</p>
          </div>
          <Button
            type="button"
            variant="tinted"
            onClick={() => {
              setEditing(undefined);
              setDrawer(true);
            }}
          >
            New expense
          </Button>
        </div>

        <SubscriptionDueBanner />

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(undefined)}
              aria-label="Dismiss error"
              className="shrink-0 cursor-pointer text-[var(--rose)]/70 transition-colors hover:text-[var(--rose)]"
            >
              ✕
            </button>
          </div>
        )}

        {initialLoading ? (
          <MetricCardsSkeleton count={2} className="mb-4 md:grid-cols-3" />
        ) : (
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="!p-4">
              <p className="mb-1 text-[11px] uppercase tracking-[0.04em] text-[var(--text-3)]">
                {spentLabel}
              </p>
              <div className="flex items-baseline gap-1.5">
                {hasBudgetPeriod && (
                  <span className="font-mono text-xs text-[var(--text-3)]">{currencyLabel}</span>
                )}
                <span className="font-mono text-[22px] font-medium tabular-nums text-[var(--text-1)]">
                  {hasBudgetPeriod ? (summary?.spentInBudgetPeriod ?? 0).toFixed(2) : "—"}
                </span>
              </div>
            </Card>
            <Card className="!p-4">
              <p className="mb-1 text-[11px] uppercase tracking-[0.04em] text-[var(--text-3)]">
                Budget period remaining
              </p>
              <div className="flex items-baseline gap-1.5">
                {hasBudgetPeriod && (
                  <span className="font-mono text-xs text-[var(--text-3)]">{currencyLabel}</span>
                )}
                <span className="font-mono text-[22px] font-medium tabular-nums text-[var(--text-1)]">
                  {hasBudgetPeriod ? (summary?.remaining ?? 0).toFixed(2) : "—"}
                </span>
              </div>
            </Card>
          </div>
        )}

        <Card className="!p-4 mb-4" title="Expense history">
          <div className="mb-3 flex flex-wrap gap-2">
            <Input.Search
              aria-label="Search expenses"
              placeholder="Search expenses"
              allowClear
              onSearch={(value) =>
                setFilters((current) => ({ ...current, q: value }))
              }
              style={{ width: 220 }}
            />
            <DatePicker.RangePicker
              aria-label="Filter by date range"
              placeholder={["From", "To"]}
              allowClear
              onChange={(dates: [Dayjs | null, Dayjs | null] | null) =>
                setFilters((current) => ({
                  ...current,
                  from: dates?.[0] ? dates[0].format("YYYY-MM-DD") : "",
                  to: dates?.[1] ? dates[1].format("YYYY-MM-DD") : "",
                }))
              }
            />
            <Select
              aria-label="Filter by category"
              allowClear
              placeholder="Category"
              style={{ width: 180 }}
              options={categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  categoryId: value ?? "",
                }))
              }
            />
          </div>
          {initialLoading ? (
            <TableSkeleton rows={7} columns={5} />
          ) : (
            <ExpenseList
              expenses={rows}
              loadingMore={loadingMore}
              hasMore={rows.length < (list?.pagination.totalCount ?? 0)}
              page={page}
              pageSize={pageSize}
              total={list?.pagination.totalCount ?? 0}
              onPage={(next) => void reload(next)}
              onPageSizeChange={(size) => setPageSize(size)}
              onLoadMore={() => void loadMore()}
              onEdit={(expense) => {
                setEditing(expense);
                setDrawer(true);
              }}
              onDelete={async (id) =>
                refreshAfter(await deleteExpenseAction(id))
              }
              onReceipt={(expense) => void openReceipt(expense)}
            />
          )}
        </Card>
      </div>

      <Modal
        open={drawer}
        onClose={() => setDrawer(false)}
        title={editing ? "Edit expense" : "New expense"}
        maxWidth="max-w-xl"
      >
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          <ExpenseForm
            categories={categories}
            expense={editing}
            loading={saving}
            onSubmit={saveExpense}
            onCancel={() => setDrawer(false)}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(receiptUrl || receiptLoading || receiptError)}
        onClose={() => {
          setReceiptUrl(undefined);
          setReceiptError(undefined);
        }}
        title="Receipt"
      >
        {receiptLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spin aria-label="Loading receipt" />
          </div>
        ) : receiptUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receiptUrl}
              alt="Expense receipt"
              className="max-h-[60vh] w-full rounded-lg object-contain"
            />
            <p className="mt-3 text-sm">
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--emerald-text)] hover:underline"
              >
                Open receipt in new tab
              </a>
            </p>
          </>
        ) : (
          <p className="text-sm text-[var(--rose)]">{receiptError}</p>
        )}
      </Modal>
    </>
  );
}
