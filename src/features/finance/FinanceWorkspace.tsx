"use client";

import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Image,
  Input,
  Layout,
  Modal,
  Row,
  Select,
  Spin,
  Statistic,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryManager } from "./CategoryManager";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseList } from "./ExpenseList";
import type {
  Category,
  CategoryWritePayload,
  Expense,
  ExpenseListResponse,
  ExpenseWritePayload,
  Summary,
} from "./finance.types";
import {
  createCategoryAction,
  createExpenseAction,
  deleteCategoryAction,
  deleteExpenseAction,
  getCategoriesAction,
  getExpenseAction,
  getExpensesAction,
  getFinanceSummaryAction,
  getUserMeAction,
  updateCategoryAction,
  updateExpenseAction,
  userLogoutAction,
} from "@/lib/userActions";

type User = { name: string; email: string; role: string };

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

export function FinanceWorkspace({ initialUser }: { initialUser?: User }) {
  const router = useRouter();
  const [user, setUser] = useState<User>();
  const [summary, setSummary] = useState<Summary>();
  const [list, setList] = useState<ExpenseListResponse>();
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

      setUser(profile.data.user);
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "20",
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
        setPage(nextPage);
      }
      setLoading(false);
    },
    [filters, router],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

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

  const displayUser = user ?? initialUser;
  const moneyCards = summary?.currencyBreakdown?.map((item) => (
    <Col xs={24} md={8} key={item.currency}>
      <Card>
        <Statistic
          title={`Spent (${item.currency})`}
          value={item.total}
          precision={2}
        />
      </Card>
    </Col>
  )) ?? (
    <Col xs={24} md={8}>
      <Card>
        <Statistic title="Spent" value="—" />
      </Card>
    </Col>
  );

  return (
    <Layout className="min-h-screen bg-slate-950">
      <Layout.Header className="flex items-center justify-between">
        <Typography.Title level={3} className="!mb-0 !text-white">
          Finance
        </Typography.Title>
        <div className="flex items-center gap-3 text-white">
          <span className="hidden sm:inline">
            {displayUser?.name || displayUser?.email}
          </span>
          <Button
            onClick={async () => {
              await userLogoutAction();
              router.push("/user-login");
            }}
          >
            Sign out
          </Button>
        </div>
      </Layout.Header>
      <Layout.Content className="mx-auto w-full max-w-7xl p-4 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Typography.Title level={1}>Your expenses</Typography.Title>
            <Typography.Text type="secondary">
              Live data from your Budget account.
            </Typography.Text>
          </div>
          <Button
            type="primary"
            onClick={() => {
              setEditing(undefined);
              setDrawer(true);
            }}
          >
            New expense
          </Button>
        </div>
        {error && (
          <Alert
            className="mb-4"
            type="error"
            showIcon
            message={error}
            closable
            onClose={() => setError(undefined)}
          />
        )}
        <Row gutter={[16, 16]} className="mb-6">
          {moneyCards}
          <Col xs={24} md={8}>
            <Card>
              <Statistic
                title="Budget period remaining"
                value={summary?.currency ? summary.remaining ?? "—" : "—"}
                suffix={summary?.currency ?? undefined}
              />
            </Card>
          </Col>
        </Row>
        <Card className="mb-6" title="Expense history">
          <div className="mb-4 flex flex-wrap gap-2">
            <Input.Search
              aria-label="Search expenses"
              placeholder="Search expenses"
              allowClear
              onSearch={(value) =>
                setFilters((current) => ({ ...current, q: value }))
              }
              style={{ width: 220 }}
            />
            <Input
              aria-label="Filter from date"
              type="date"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
            />
            <Input
              aria-label="Filter to date"
              type="date"
              onChange={(event) =>
                setFilters((current) => ({ ...current, to: event.target.value }))
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
          <ExpenseList
            expenses={list?.expenses ?? []}
            loading={loading}
            page={page}
            total={list?.pagination.totalCount ?? 0}
            onPage={(next) => void reload(next)}
            onEdit={(expense) => {
              setEditing(expense);
              setDrawer(true);
            }}
            onDelete={async (id) =>
              refreshAfter(await deleteExpenseAction(id))
            }
            onReceipt={(expense) => void openReceipt(expense)}
          />
        </Card>
        <Card>
          <CategoryManager
            categories={categories}
            onCreate={async (body: CategoryWritePayload) =>
              refreshAfter(await createCategoryAction(body))
            }
            onUpdate={async (id, body: CategoryWritePayload) =>
              refreshAfter(await updateCategoryAction(id, body))
            }
            onDelete={async (id) =>
              refreshAfter(await deleteCategoryAction(id))
            }
          />
        </Card>
      </Layout.Content>
      <Drawer
        title={editing ? "Edit expense" : "New expense"}
        open={drawer}
        onClose={() => setDrawer(false)}
        width={Math.min(
          560,
          typeof window === "undefined" ? 560 : window.innerWidth - 24,
        )}
      >
        <ExpenseForm
          categories={categories}
          expense={editing}
          loading={saving}
          onSubmit={saveExpense}
          onCancel={() => setDrawer(false)}
        />
      </Drawer>
      <Modal
        open={Boolean(receiptUrl || receiptLoading || receiptError)}
        title="Receipt"
        footer={null}
        onCancel={() => {
          setReceiptUrl(undefined);
          setReceiptError(undefined);
        }}
        aria-label="Receipt preview"
      >
        {receiptLoading ? (
          <Spin aria-label="Loading receipt" />
        ) : receiptUrl ? (
          <>
            <Image
              src={receiptUrl}
              alt="Expense receipt"
              className="max-h-[60vh] object-contain"
            />
            <p className="mt-3">
              <a href={receiptUrl} target="_blank" rel="noreferrer">
                Open receipt in new tab
              </a>
            </p>
          </>
        ) : (
          <Alert type="error" showIcon message={receiptError} />
        )}
      </Modal>
      {loading && !list && <Spin fullscreen />}
    </Layout>
  );
}
