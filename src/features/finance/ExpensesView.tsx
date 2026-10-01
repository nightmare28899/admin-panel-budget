"use client";

import { DatePicker, Input, Select, Spin } from "antd";
import { SafetyOutlined, WalletOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseList } from "./ExpenseList";
import type {
  Category,
  Expense,
  ExpenseListResponse,
  ExpensePaymentStatus,
  ExpenseWritePayload,
  BudgetWritePayload,
  Summary,
} from "./finance.types";
import { toCalendarDate } from "./finance.types";
import { BudgetSettingsModal } from "./BudgetSettingsModal";
import { resolvePrimaryCurrency } from "./reportMetrics";
import {
  createExpenseAction,
  deleteExpenseAction,
  getCategoriesAction,
  getExpenseAction,
  getExpensesAction,
  getFinanceSummaryAction,
  getUserMeAction,
  seedTestDataAction,
  updateBudgetAction,
  updateExpenseAction,
} from "@/lib/userActions";
import { Button } from "@/components/ui/Button";
import { BudgetRing } from "@/components/ui/BudgetRing";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { MetricCardsSkeleton, TableSkeleton } from "@/components/ui/ContentSkeleton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { SubscriptionDueBanner } from "./SubscriptionDueBanner";
import { useCreditCards } from "./hooks/useCreditCards";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";

const PERIOD_LABEL_KEYS = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  annual: "yearly",
  period: "budgetCustomRange",
} as const;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

// Calendar month of the viewer's local clock, as YYYY-MM-DD bounds.
function currentMonthRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  return {
    from: `${year}-${pad2(month + 1)}-01`,
    to: `${year}-${pad2(month + 1)}-${pad2(last)}`,
  };
}

const TEST_DATA_ENABLED =
  process.env.NEXT_PUBLIC_TEST_DATA_ENABLED === "true";

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
  const { t, formatNumber, formatDate } = useLocale();
  const [summary, setSummary] = useState<Summary>();
  const [monthTotals, setMonthTotals] = useState<Array<{ currency: string; total: number }>>();
  const [userCurrency, setUserCurrency] = useState<string>();
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetError, setBudgetError] = useState<string>();
  const [list, setList] = useState<ExpenseListResponse>();
  const [rows, setRows] = useState<Expense[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [filters, setFilters] = useState<{
    q: string;
    from: string;
    to: string;
    categoryId: string;
    creditCardId: string;
    paymentStatus: ExpensePaymentStatus | "";
  }>({
    q: "",
    from: "",
    to: "",
    categoryId: "",
    creditCardId: "",
    paymentStatus: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<Expense>();
  const [saving, setSaving] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string>();
  const [receiptUrl, setReceiptUrl] = useState<string>();
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string>();
  const [testDataConfirmationOpen, setTestDataConfirmationOpen] = useState(false);
  const [testDataPending, setTestDataPending] = useState(false);
  const [testDataFeedback, setTestDataFeedback] = useState<{
    tone: "success" | "partial" | "error";
    message: string;
  }>();
  const [activeUserLoadCompleted, setActiveUserLoadCompleted] = useState(false);
  const autoSeedAttemptedRef = useRef(false);
  const { cards: creditCards } = useCreditCards();

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

      const month = currentMonthRange();
      const [sum, cats, expenses, monthExpenses] = await Promise.all([
        getFinanceSummaryAction(),
        getCategoriesAction(),
        getExpensesAction(params.toString()),
        // Month spend per currency (limit=1: only the aggregate breakdown is used).
        getExpensesAction(new URLSearchParams({ ...month, page: "1", limit: "1" }).toString()),
      ]);
      setActiveUserLoadCompleted(true);

      if (sum.error || cats.error || expenses.error) {
        setError(frontendError(sum.error ?? cats.error ?? expenses.error, t, "requestFailedGeneric"));
      } else {
        setSummary(sum.data);
        setUserCurrency(profile.data.user.currency);
        setMonthTotals(monthExpenses.error ? undefined : monthExpenses.data?.currencyBreakdown ?? []);
        setCategories(cats.data ?? []);
        setList(expenses.data);
        setRows(expenses.data?.expenses ?? []);
        setPage(nextPage);
      }
      setLoading(false);
    },
    [filters, pageSize, router, t],
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
      setError(frontendError(result.error, t, "requestFailedGeneric"));
    } else if (result.data) {
      setRows((current) => [...current, ...result.data!.expenses]);
      setList(result.data);
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  const saveExpense = async (values: ExpenseWritePayload, receipt?: File) => {
    if (saving) return;

    setSaving(true);
    setError(undefined);
    setNotice(undefined);
    setFormError(undefined);

    try {
      const result = editing
        ? await updateExpenseAction(editing.id, values)
        : await createExpenseAction(values, receipt);

      if (result.error) {
        setFormError(frontendError(result.error, t, "requestFailedGeneric"));
        return;
      }

      setNotice(t(editing ? "expenseUpdated" : "expenseCreated"));
      setDrawer(false);
      setEditing(undefined);
      await reload(page);
    } finally {
      setSaving(false);
    }
  };

  const openReceipt = async (expense: Expense) => {
    setReceiptError(undefined);
    setReceiptUrl(undefined);
    setReceiptLoading(true);
    const result = await getExpenseAction(expense.id);
    const url = safeReceiptUrl(result.data?.imagePresignedUrl);

    if (url) setReceiptUrl(url);
    else setReceiptError(frontendError(result.error, t, "receiptUnavailable"));
    setReceiptLoading(false);
  };

  const deleteExpense = async (id: string) => {
    if (deletingExpenseId) return;

    setDeletingExpenseId(id);
    setError(undefined);
    setNotice(undefined);
    setFormError(undefined);

    try {
      const result = await deleteExpenseAction(id);
      if (result.error) {
        setError(frontendError(result.error, t, "requestFailedGeneric"));
        return;
      }

      setNotice(t("expenseDeleted"));
      const remainingTotal = Math.max(0, (list?.pagination.totalCount ?? rows.length) - 1);
      const lastPage = Math.max(1, Math.ceil(remainingTotal / pageSize));
      await reload(Math.min(page, lastPage));
    } finally {
      setDeletingExpenseId(undefined);
    }
  };

  const closeExpenseForm = () => {
    if (saving) return;
    setDrawer(false);
    setFormError(undefined);
  };

  const generateTestData = useCallback(async () => {
    if (!TEST_DATA_ENABLED || testDataPending) return;

    setTestDataPending(true);
    setTestDataFeedback(undefined);
    let result;
    try {
      result = await seedTestDataAction();
    } catch {
      setTestDataPending(false);
      setTestDataConfirmationOpen(false);
      setTestDataFeedback({
        tone: "error",
        message: t("testDataGenerationFailed"),
      });
      return;
    }
    setTestDataPending(false);
    setTestDataConfirmationOpen(false);

    if (result.sessionExpired) {
      router.push("/user-login");
      return;
    }

    if (result.error || !result.data) {
      setTestDataFeedback({
        tone: "error",
        message: frontendError(
          result.error,
          t,
          "testDataGenerationFailed",
        ),
      });
      return;
    }

    const counts = {
      created: formatNumber(result.data.created),
      skipped: formatNumber(result.data.skipped),
      failed: formatNumber(result.data.failed),
    };
    const tone =
      result.data.failed === 0
        ? "success"
        : result.data.created > 0 || result.data.skipped > 0
          ? "partial"
          : "error";
    setTestDataFeedback({
      tone,
      message: t(
        tone === "success"
          ? "testDataGenerationSuccess"
          : tone === "partial"
            ? "testDataGenerationPartial"
            : "testDataGenerationFailedWithCounts",
        counts,
      ),
    });
    if (tone !== "error") await reload(1);
  }, [formatNumber, reload, router, t, testDataPending]);

  useEffect(() => {
    if (
      !TEST_DATA_ENABLED ||
      !activeUserLoadCompleted ||
      autoSeedAttemptedRef.current
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (autoSeedAttemptedRef.current) return;

      autoSeedAttemptedRef.current = true;
      void generateTestData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeUserLoadCompleted, generateTestData]);

  const saveBudget = async (payload: BudgetWritePayload) => {
    if (budgetSaving) return;
    setBudgetSaving(true);
    setBudgetError(undefined);
    try {
      const result = await updateBudgetAction(payload);
      if (result.sessionExpired) {
        router.push("/user-login");
        return;
      }
      if (result.error) {
        setBudgetError(frontendError(result.error, t, "requestFailedGeneric"));
        return;
      }
      setNotice(t(payload.budgetAmount > 0 ? "budgetSaved" : "budgetRemoved"));
      setBudgetModalOpen(false);
      await reload(page);
    } finally {
      setBudgetSaving(false);
    }
  };

  const openBudgetModal = () => {
    setBudgetError(undefined);
    setBudgetModalOpen(true);
  };

  const hasBudgetPeriod = (summary?.budgetAmount ?? 0) > 0;
  const currencyLabel = summary?.currency || "MXN";
  const spentLabel = t(hasBudgetPeriod ? "spentThisPeriod" : "spentThisMonth");
  const moneyOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  const monthCurrency = monthTotals
    ? resolvePrimaryCurrency(userCurrency, monthTotals.map((item) => item.currency)) ??
      [...monthTotals].sort((a, b) => b.total - a.total)[0]?.currency
    : undefined;
  const monthTotal = monthTotals?.find((item) => item.currency === monthCurrency)?.total ?? 0;
  const otherMonthTotals = (monthTotals ?? []).filter((item) => item.currency !== monthCurrency && item.total > 0);
  const calendarDay = (value: string | null | undefined) => {
    const [year, month, day] = toCalendarDate(value).split("-").map(Number);
    return year ? new Date(year, month - 1, day) : null;
  };
  const periodStart = calendarDay(summary?.budgetPeriodStart);
  const periodEnd = calendarDay(summary?.budgetPeriodEnd);
  const shortDate = (date: Date) => formatDate(date, { day: "numeric", month: "short" });
  const periodLabel = summary?.budgetPeriod
    ? [
        t(PERIOD_LABEL_KEYS[summary.budgetPeriod]),
        periodStart && periodEnd
          ? summary.budgetPeriod === "daily"
            ? shortDate(periodStart)
            : `${shortDate(periodStart)} – ${shortDate(periodEnd)}`
          : null,
      ].filter(Boolean).join(" · ")
    : "";
  const initialLoading = loading && !list;

  return (
    <>
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">{t("yourExpenses")}</h1>
            <p className="mt-0.5 text-sm text-[var(--text-3)]">{t("expensesDescription")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TEST_DATA_ENABLED && (
              <Button
                type="button"
                variant="outline"
                disabled={testDataPending}
                onClick={() => setTestDataConfirmationOpen(true)}
              >
                {t("generateTestData")}
              </Button>
            )}
            <Button
              type="button"
              variant="tinted"
              onClick={() => {
                setEditing(undefined);
                setFormError(undefined);
                setDrawer(true);
              }}
            >
              {t("newExpense")}
            </Button>
          </div>
        </div>

        <SubscriptionDueBanner />

        {testDataFeedback && (
          <div
            role={testDataFeedback.tone === "error" ? "alert" : "status"}
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              testDataFeedback.tone === "success"
                ? "border-[var(--emerald)]/40 bg-[var(--emerald)]/10 text-[var(--emerald-text)]"
                : testDataFeedback.tone === "partial"
                  ? "border-[var(--gold)]/40 bg-[var(--gold-dim)] text-[var(--gold-text)]"
                  : "border-[var(--rose)]/40 bg-[var(--rose)]/10 text-[var(--rose)]"
            }`}
          >
            {testDataFeedback.message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(undefined)}
              aria-label={t("dismissError")}
              className="shrink-0 cursor-pointer text-[var(--rose)]/70 transition-colors hover:text-[var(--rose)]"
            >
              ✕
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[var(--emerald)]/40 bg-[var(--emerald-dim)] px-4 py-3 text-sm text-[var(--emerald-text)]"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(undefined)}
              aria-label={t("dismissNotification")}
              className="shrink-0 cursor-pointer text-[var(--emerald-text)]/70 transition-colors hover:text-[var(--emerald-text)]"
            >
              ✕
            </button>
          </div>
        )}

        {initialLoading ? (
          <MetricCardsSkeleton count={2} className="mb-4 md:grid-cols-3" />
        ) : (
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard
              tone="rose"
              icon={<WalletOutlined />}
              label={spentLabel}
              unit={hasBudgetPeriod ? currencyLabel : monthCurrency}
              value={
                hasBudgetPeriod
                  ? formatNumber(summary?.spentInBudgetPeriod ?? 0, moneyOptions)
                  : monthTotals && monthCurrency
                    ? formatNumber(monthTotal, moneyOptions)
                    : monthTotals ? formatNumber(0, moneyOptions) : "—"
              }
              extraPlacement="below"
              extra={
                hasBudgetPeriod ? (
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--text-3)]">
                    <span>{periodLabel}</span>
                    <button
                      type="button"
                      onClick={openBudgetModal}
                      className="cursor-pointer text-[var(--emerald-text)] hover:underline"
                    >
                      {t("editBudget")}
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-[var(--text-3)]">
                    <span className="inline-block first-letter:uppercase">{formatDate(new Date(), { month: "long", year: "numeric" })}</span>
                    {otherMonthTotals.map((item) => (
                      <span key={item.currency}>
                        {" · "}
                        {item.currency} {formatNumber(item.total, moneyOptions)}
                      </span>
                    ))}
                  </div>
                )
              }
            />
            {hasBudgetPeriod ? (
              <StatCard
                tone="emerald"
                icon={<SafetyOutlined />}
                label={t("budgetRemaining")}
                unit={currencyLabel}
                value={formatNumber(summary?.remaining ?? 0, moneyOptions)}
                extra={<BudgetRing percentage={summary?.percentage ?? 0} />}
              />
            ) : (
              <StatCard
                tone="emerald"
                icon={<SafetyOutlined />}
                label={t("noBudgetConfigured")}
                value="—"
                extraPlacement="below"
                extra={
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--text-3)]">{t("noBudgetHint")}</p>
                    <Button type="button" variant="tinted" size="sm" onClick={openBudgetModal}>
                      {t("configureBudget")}
                    </Button>
                  </div>
                }
              />
            )}
          </div>
        )}

        <Card className="!p-4 mb-4" title={t("expenseHistory")}>
          <div className="mb-3 flex flex-wrap gap-2">
            <Input.Search
              aria-label={t("searchExpenses")}
              placeholder={t("searchExpenses")}
              allowClear
              onSearch={(value) =>
                setFilters((current) => ({ ...current, q: value }))
              }
              style={{ width: 220 }}
            />
            <DatePicker.RangePicker
              aria-label={t("filterDateRange")}
              placeholder={[t("from"), t("to")]}
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
              aria-label={t("filterCategory")}
              allowClear
              placeholder={t("category")}
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
            <Select
              aria-label={t("filterByCard")}
              allowClear
              placeholder={t("allCards")}
              style={{ width: 200 }}
              value={filters.creditCardId || undefined}
              options={creditCards.map((card) => ({
                value: card.id,
                label: `${card.bank} · ${card.name} •••• ${card.last4}`,
              }))}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  creditCardId: value ?? "",
                }))
              }
            />
            <Select
              aria-label={t("filterPaymentStatus")}
              value={filters.paymentStatus}
              style={{ width: 180 }}
              options={[
                { value: "", label: t("all") },
                { value: "PAID", label: t("paid") },
                { value: "PARTIAL", label: t("partial") },
                { value: "UNPAID", label: t("unpaid") },
              ]}
              onChange={(value: ExpensePaymentStatus | "") =>
                setFilters((current) => ({
                  ...current,
                  paymentStatus: value,
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
                setFormError(undefined);
                setDrawer(true);
              }}
              onDelete={deleteExpense}
              deletingExpenseId={deletingExpenseId}
              onReceipt={(expense) => void openReceipt(expense)}
            />
          )}
        </Card>
      </div>

      <Modal
        open={drawer}
        onClose={closeExpenseForm}
        title={editing ? t("editExpense") : t("newExpense")}
        maxWidth="max-w-xl"
      >
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          <ExpenseForm
            categories={categories}
            creditCards={creditCards}
            expense={editing}
            loading={saving}
            error={formError}
            onSubmit={saveExpense}
            onCancel={closeExpenseForm}
          />
        </div>
      </Modal>

      <BudgetSettingsModal
        open={budgetModalOpen}
        initial={{
          amount: summary?.budgetAmount,
          period: summary?.budgetPeriod,
          start: summary?.budgetPeriodStart,
          end: summary?.budgetPeriodEnd,
        }}
        loading={budgetSaving}
        error={budgetError}
        onClose={() => setBudgetModalOpen(false)}
        onSave={saveBudget}
      />

      {TEST_DATA_ENABLED && (
        <ConfirmModal
          open={testDataConfirmationOpen}
          onClose={() => setTestDataConfirmationOpen(false)}
          onConfirm={generateTestData}
          title={t("generateTestDataQuestion")}
          description={t("generateTestDataDescription")}
          confirmLabel={t("generateTestData")}
          confirmingLabel={t("generatingTestData")}
          confirmVariant="success"
          loading={testDataPending}
        />
      )}

      <Modal
        open={Boolean(receiptUrl || receiptLoading || receiptError)}
        onClose={() => {
          setReceiptUrl(undefined);
          setReceiptError(undefined);
        }}
        title={t("receipt")}
      >
        {receiptLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spin aria-label={t("loadingReceipt")} />
          </div>
        ) : receiptUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receiptUrl}
              alt={t("expenseReceipt")}
              className="max-h-[60vh] w-full rounded-lg object-contain"
            />
            <p className="mt-3 text-sm">
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--emerald-text)] hover:underline"
              >
                {t("openReceiptNewTab")}
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
