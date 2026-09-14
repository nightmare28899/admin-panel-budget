"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { DatePicker, Form, Input, InputNumber, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { CalendarOutlined, LeftOutlined, RightOutlined, RocketOutlined, WalletOutlined } from "@ant-design/icons";
import type { Category } from "./finance.types";
import { toCalendarDate } from "./finance.types";
import type { CreditCardSummary } from "./statement-import.types";
import {
  BILLING_CYCLE_VALUES,
  SUBSCRIPTION_PAYMENT_METHOD_VALUES,
  daysUntil,
  getMonthlyFactor,
  type BillingCycle,
  type CreateSubscriptionPayload,
  type Subscription,
} from "./subscriptions.types";
import {
  createSubscriptionAction,
  deactivateSubscriptionAction,
  getCategoriesAction,
  getSubscriptionsAction,
  getUserMeAction,
  updateSubscriptionAction,
} from "@/lib/userActions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CreditCardsSkeleton } from "@/components/ui/ContentSkeleton";
import { categoryTokens } from "./categoryVisuals";
import { CreditCardPicker } from "./CreditCardPicker";
import { useCreditCards } from "./hooks/useCreditCards";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";

// Fonts are loaded (and their CSS variables scoped) only for this view — see
// the "Obsidian Mint Fintech" design system note on the root wrapper below.
// Nothing outside SubscriptionsView's own subtree ever sees these variables.
const headlineFont = Plus_Jakarta_Sans({
  variable: "--font-sub-jakarta",
  weight: ["600", "700"],
  subsets: ["latin"],
  display: "swap",
});
const bodyFont = Inter({
  variable: "--font-sub-inter",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});
const monoFont = JetBrains_Mono({
  variable: "--font-sub-mono",
  weight: ["500"],
  subsets: ["latin"],
  display: "swap",
});

// Local design tokens ("Obsidian Mint Fintech") — applied as CSS custom
// properties on this view's own root wrapper only. No global token file is
// touched; nothing here leaks past this component's subtree.
const THEME_STYLE = {
  "--sub-canvas": "#090D10",
  "--sub-surface-base": "#10161A",
  "--sub-surface-raised": "#161F26",
  "--sub-surface-overlay": "#1E293B",
  "--sub-surface-tint-emerald": "rgba(16, 185, 129, 0.08)",
  "--sub-primary": "#10B981",
  "--sub-primary-subtle": "#059669",
  "--sub-primary-light": "#34D399",
  "--sub-secondary": "#38BDF8",
  "--sub-danger": "#F43F5E",
  "--sub-warning": "#F59E0B",
  "--sub-text-high": "#F8FAFC",
  "--sub-text-medium": "#94A3B8",
  "--sub-text-low": "#64748B",
  "--sub-border-subtle": "rgba(255, 255, 255, 0.06)",
  "--sub-border-active": "rgba(16, 185, 129, 0.35)",
} as CSSProperties;

const PILL_PRIMARY =
  "inline-flex cursor-pointer select-none items-center justify-center gap-1.5 rounded-full border border-transparent bg-[var(--sub-primary)] font-semibold text-[#04120C] transition-colors hover:bg-[var(--sub-primary-light)] disabled:cursor-not-allowed disabled:opacity-40";

const PILL_SECONDARY =
  "inline-flex cursor-pointer select-none items-center justify-center gap-1.5 rounded-full border border-white/[0.12] bg-[var(--sub-surface-overlay)]/40 font-medium text-[var(--sub-text-high)] transition-colors hover:border-[var(--sub-text-medium)] hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/[0.12] disabled:hover:bg-[var(--sub-surface-overlay)]/40";

const PILL_DESTRUCTIVE =
  "inline-flex cursor-pointer select-none items-center justify-center gap-1.5 rounded-full border border-[var(--sub-danger)]/30 bg-[var(--sub-danger)]/[0.15] font-medium text-[var(--sub-danger)] transition-colors hover:bg-[var(--sub-danger)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

const BILLING_CYCLE_LABEL_KEYS = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

const PAYMENT_METHOD_LABEL_KEYS = {
  CASH: "cash",
  CREDIT_CARD: "creditCard",
  DEBIT_CARD: "debitCard",
  TRANSFER: "transfer",
} as const;

type FilterTab = "all" | "active" | "paused";

type SubscriptionFormValues = {
  name: string;
  cost: number;
  currency: string;
  billingCycle: BillingCycle;
  nextPaymentDate: Dayjs;
  paymentMethod: string;
  categoryId?: string;
  reminderDays?: number;
};

function StatTile({
  icon,
  label,
  value,
  unit,
  footer,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--sub-border-subtle)] bg-[var(--sub-surface-raised)] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="font-[family-name:var(--font-sub-inter)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--sub-text-medium)]">
          {label}
        </p>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--sub-surface-tint-emerald)] text-sm text-[var(--sub-primary-light)]">
          {icon}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5 font-[family-name:var(--font-sub-jakarta)]">
        {unit && <span className="font-[family-name:var(--font-sub-mono)] text-xs text-[var(--sub-text-medium)]">{unit}</span>}
        <span className="text-[26px] font-bold leading-8 tracking-[-0.02em] tabular-nums text-[var(--sub-text-high)]">
          {value}
        </span>
      </div>
      {footer && <div className="mt-2 space-y-0.5">{footer}</div>}
    </div>
  );
}

function StatTileSkeleton() {
  return (
    <div className="rounded-[16px] border border-[var(--sub-border-subtle)] bg-[var(--sub-surface-raised)] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-7 w-7 shrink-0 animate-pulse rounded-[8px] bg-white/[0.06]" />
      </div>
      <div className="mt-3 h-7 w-28 animate-pulse rounded bg-white/[0.06]" />
    </div>
  );
}

// A separate, freshly-mounted component per modal open (same convention as
// ExpenseForm) so a bare Form.useForm() + initialValues fully resets between
// "New subscription" and editing different rows — no imperative
// resetFields()/setFieldsValue() bookkeeping needed on the parent.
function SubscriptionForm({
  subscription,
  categories,
  creditCards,
  creditCardsLoading,
  creditCardsError,
  loading,
  submitError,
  onSubmit,
  onCancel,
}: {
  subscription?: Subscription;
  categories: Category[];
  creditCards: CreditCardSummary[];
  creditCardsLoading: boolean;
  creditCardsError?: string;
  loading?: boolean;
  submitError?: string;
  onSubmit: (payload: CreateSubscriptionPayload) => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const [form] = Form.useForm<SubscriptionFormValues>();
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string | undefined>(
    subscription?.creditCardId ?? undefined,
  );
  const [localError, setLocalError] = useState<string>();
  const watchedPaymentMethod =
    Form.useWatch("paymentMethod", form) ?? subscription?.paymentMethod ?? "CREDIT_CARD";
  const displayedError = localError ?? submitError;

  const submit = (values: SubscriptionFormValues) => {
    if (values.paymentMethod === "CREDIT_CARD" && !selectedCreditCardId) {
      setLocalError(t("creditCardRequiredForMethod"));
      return;
    }
    setLocalError(undefined);
    onSubmit({
      name: values.name,
      cost: Number(values.cost),
      paymentMethod: values.paymentMethod,
      creditCardId: values.paymentMethod === "CREDIT_CARD" ? selectedCreditCardId : undefined,
      currency: values.currency.toUpperCase(),
      billingCycle: values.billingCycle,
      nextPaymentDate: `${values.nextPaymentDate.format("YYYY-MM-DD")}T12:00:00.000Z`,
      reminderDays: values.reminderDays ?? 3,
      categoryId: values.categoryId ?? null,
    });
  };

  return (
    <Form<SubscriptionFormValues>
      form={form}
      layout="vertical"
      initialValues={
        subscription
          ? {
              name: subscription.name,
              cost: Number(subscription.cost),
              currency: subscription.currency,
              billingCycle: subscription.billingCycle,
              nextPaymentDate: dayjs(subscription.nextPaymentDate),
              paymentMethod: subscription.paymentMethod,
              categoryId: subscription.categoryId ?? undefined,
              reminderDays: subscription.reminderDays,
            }
          : { currency: "MXN", billingCycle: "MONTHLY", paymentMethod: "CREDIT_CARD", reminderDays: 3 }
      }
      onFinish={submit}
    >
      {displayedError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-[var(--rose)]/30 bg-[var(--rose)]/10 px-3 py-2 text-sm text-[var(--rose)]"
        >
          {displayedError}
        </div>
      )}
      <Form.Item name="name" label={t("name")} rules={[{ required: true, whitespace: true }]}>
        <Input maxLength={120} placeholder={t("subscriptionNamePlaceholder")} />
      </Form.Item>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Form.Item name="cost" label={t("amount")} rules={[{ required: true, type: "number", min: 0 }]}>
          <InputNumber min={0} step={0.01} className="w-full" placeholder="0.00" />
        </Form.Item>
        <Form.Item name="currency" label={t("currency")} rules={[{ required: true, len: 3 }]}>
          <Input maxLength={3} placeholder="MXN" />
        </Form.Item>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Form.Item name="billingCycle" label={t("billingCycleLabel")} rules={[{ required: true }]}>
          <Select
            options={BILLING_CYCLE_VALUES.map((cycle) => ({
              value: cycle,
              label: t(BILLING_CYCLE_LABEL_KEYS[cycle]),
            }))}
          />
        </Form.Item>
        <Form.Item name="nextPaymentDate" label={t("nextPaymentDateLabel")} rules={[{ required: true }]}>
          <DatePicker
            className="w-full"
            disabledDate={(current) => Boolean(current) && current.isBefore(dayjs().endOf("day"))}
          />
        </Form.Item>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Form.Item name="paymentMethod" label={t("paymentMethodLabel")} rules={[{ required: true }]}>
          <Select
            options={SUBSCRIPTION_PAYMENT_METHOD_VALUES.map((method) => ({
              value: method,
              label: t(PAYMENT_METHOD_LABEL_KEYS[method]),
            }))}
            onChange={(value: string) => {
              if (value !== "CREDIT_CARD") setSelectedCreditCardId(undefined);
              setLocalError(undefined);
            }}
          />
        </Form.Item>
        <Form.Item name="reminderDays" label={t("reminderDaysLabel")} tooltip={t("reminderDaysHelp")}>
          <InputNumber min={0} max={30} className="w-full" placeholder="3" />
        </Form.Item>
      </div>
      <Form.Item name="categoryId" label={t("category")}>
        <Select
          allowClear
          placeholder={t("selectCategory")}
          options={categories.map((category) => ({
            value: category.id,
            label: `${category.icon ?? ""} ${category.name}`,
          }))}
        />
      </Form.Item>
      {watchedPaymentMethod === "CREDIT_CARD" && (
        <div className="mb-4">
          <p className="mb-1 text-sm font-medium text-[var(--text-1)]">{t("creditCard")}</p>
          {creditCardsLoading ? (
            <CreditCardsSkeleton />
          ) : (
            <CreditCardPicker
              cards={creditCards}
              selectedCardId={selectedCreditCardId}
              onSelect={setSelectedCreditCardId}
              emptyMessage={creditCardsError ? t("cardsUnavailable") : t("noActiveCards")}
            />
          )}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {subscription ? t("saveChanges") : t("createSubscriptionCta")}
        </Button>
      </div>
    </Form>
  );
}

export function SubscriptionsView() {
  const router = useRouter();
  const { t, formatDate, formatNumber } = useLocale();
  const displayDate = (value: string) => {
    const calendarDate = toCalendarDate(value);
    return calendarDate
      ? formatDate(`${calendarDate}T12:00:00`, { dateStyle: "medium" })
      : "—";
  };
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription>();
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string>();

  const { cards: creditCards, cardsError: creditCardsError, loading: creditCardsLoading } = useCreditCards();

  const reload = useCallback(async () => {
    setLoading(true);
    const profile = await getUserMeAction();

    if (profile.error || !profile.data?.user?.isActive) {
      router.push("/user-login");
      return;
    }

    const [cats, subs] = await Promise.all([getCategoriesAction(), getSubscriptionsAction()]);

    if (cats.error) {
      setError(frontendError(cats.error, t, "requestFailedGeneric"));
      setLoading(false);
      return;
    }
    setCategories(cats.data ?? []);

    if (subs.error) {
      setError(frontendError(subs.error, t, "requestFailedGeneric"));
      setLoading(false);
      return;
    }
    setSubscriptions(subs.data ?? []);
    setLoading(false);
  }, [router, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const openCreate = () => {
    setEditingSubscription(undefined);
    setFormError(undefined);
    setFormOpen(true);
  };

  const openEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setFormError(undefined);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingSubscription(undefined);
    setFormError(undefined);
  };

  const saveSubscription = async (payload: CreateSubscriptionPayload) => {
    setSaving(true);
    const result = editingSubscription
      ? await updateSubscriptionAction(editingSubscription.id, payload)
      : await createSubscriptionAction(payload);
    setSaving(false);
    if (result.error) {
      setFormError(frontendError(result.error, t, "requestFailedGeneric"));
      return;
    }
    closeForm();
    void reload();
  };

  const pauseSubscription = async (id: string) => {
    setBusyId(id);
    const result = await deactivateSubscriptionAction(id);
    setBusyId(undefined);
    if (result.error) setError(frontendError(result.error, t, "requestFailedGeneric"));
    else void reload();
  };

  const resumeSubscription = async (id: string) => {
    setBusyId(id);
    const result = await updateSubscriptionAction(id, { isActive: true });
    setBusyId(undefined);
    if (result.error) setError(frontendError(result.error, t, "requestFailedGeneric"));
    else void reload();
  };

  // Backend already returns subscriptions ordered by nextPaymentDate
  // ascending — filtering to active/paused preserves that order, so the
  // first active item is always the soonest upcoming charge.
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.isActive);
  const pausedSubscriptions = subscriptions.filter((subscription) => !subscription.isActive);
  const filteredSubscriptions =
    filter === "active" ? activeSubscriptions : filter === "paused" ? pausedSubscriptions : subscriptions;

  const monthlyRecurringSpend = activeSubscriptions.reduce(
    (sum, subscription) => sum + Number(subscription.cost) * getMonthlyFactor(subscription.billingCycle),
    0,
  );
  const activeCurrencies = new Set(activeSubscriptions.map((subscription) => subscription.currency));
  const currencyLabel =
    activeCurrencies.size === 1 ? [...activeCurrencies][0] : activeCurrencies.size === 0 ? "MXN" : t("mixedCurrencies");
  const nextActiveSubscription = activeSubscriptions[0];
  const nextChargeDays = nextActiveSubscription ? daysUntil(nextActiveSubscription.nextPaymentDate) : undefined;
  const nextChargeHeadline =
    nextChargeDays === undefined
      ? t("noUpcomingCharges")
      : nextChargeDays < 0
        ? t("overdueBy", { count: formatNumber(Math.abs(nextChargeDays)), days: t(Math.abs(nextChargeDays) === 1 ? "day" : "days") })
        : nextChargeDays === 0
          ? t("dueToday")
          : t("dueIn", { count: formatNumber(nextChargeDays), days: t(nextChargeDays === 1 ? "day" : "days") });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: t("subsTabAll", { count: formatNumber(subscriptions.length) }) },
    { key: "active", label: t("subsTabActive", { count: formatNumber(activeSubscriptions.length) }) },
    { key: "paused", label: t("subsTabPaused", { count: formatNumber(pausedSubscriptions.length) }) },
  ];

  // Client-side pagination over the filtered list — same fixed page size
  // pattern used by ExpenseList/the previous version of this view.
  const totalPages = Math.max(1, Math.ceil(filteredSubscriptions.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStartIndex = filteredSubscriptions.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEndIndex = pageStartIndex === 0 ? 0 : Math.min(pageStartIndex + pageSize - 1, filteredSubscriptions.length);
  const pagedSubscriptions = filteredSubscriptions.slice((safePage - 1) * pageSize, (safePage - 1) * pageSize + pageSize);
  const batchSum = pagedSubscriptions.reduce((sum, subscription) => sum + Number(subscription.cost), 0);
  const pageSizeOptions = [5, 10, 20, 50].map((size) => ({
    value: size,
    label: t("rowsPerPageOption", { count: formatNumber(size) }),
  }));

  const dueBadge = (subscription: Subscription) => {
    if (!subscription.isActive) return null;
    const remaining = daysUntil(subscription.nextPaymentDate);
    if (remaining > 7) return null;
    const overdue = remaining < 0;
    const label = overdue
      ? t("overdueBy", { count: formatNumber(Math.abs(remaining)), days: t(Math.abs(remaining) === 1 ? "day" : "days") })
      : remaining === 0
        ? t("dueToday")
        : t("dueIn", { count: formatNumber(remaining), days: t(remaining === 1 ? "day" : "days") });
    return { overdue, label };
  };

  return (
    <div
      style={THEME_STYLE}
      className={`${headlineFont.variable} ${bodyFont.variable} ${monoFont.variable} min-h-screen w-full bg-[var(--sub-canvas)] font-[family-name:var(--font-sub-inter)] text-[var(--sub-text-high)]`}
    >
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <nav aria-label={t("financeBreadcrumb")} className="mb-2 flex items-center gap-1.5">
          <Link
            href="/finance"
            className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--sub-text-medium)] transition-colors hover:text-[var(--sub-primary-light)]"
          >
            {t("financeBreadcrumb")}
          </Link>
          <span aria-hidden="true" className="text-[11px] text-[var(--sub-text-low)]">
            ›
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--sub-text-low)]">
            {t("subscriptions")}
          </span>
        </nav>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-[family-name:var(--font-sub-jakarta)] text-[28px] font-semibold leading-9 tracking-[-0.02em] text-[var(--sub-text-high)]">
            {t("yourSubscriptions")}
          </h1>
          <button
            type="button"
            onClick={openCreate}
            className={`${PILL_PRIMARY} h-9 px-4 font-[family-name:var(--font-sub-inter)] text-xs`}
          >
            {t("newSubscription")}
          </button>
        </div>
        <p className="mb-6 max-w-2xl font-[family-name:var(--font-sub-inter)] text-sm leading-6 text-[var(--sub-text-medium)]">
          {t("subscriptionsPageDescription")}
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-3 rounded-[12px] border border-[var(--sub-danger)]/30 bg-[var(--sub-danger)]/10 px-4 py-3 font-[family-name:var(--font-sub-inter)] text-sm text-[var(--sub-danger)]"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(undefined)}
              aria-label={t("dismissError")}
              className="shrink-0 cursor-pointer text-[var(--sub-danger)]/70 transition-colors hover:text-[var(--sub-danger)]"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="mb-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <StatTileSkeleton />
            <StatTileSkeleton />
            <StatTileSkeleton />
          </div>
        ) : (
          <div className="mb-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <StatTile
              icon={<WalletOutlined />}
              label={t("monthlyRecurringSpend")}
              unit={currencyLabel}
              value={formatNumber(monthlyRecurringSpend, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            />
            <StatTile
              icon={<RocketOutlined />}
              label={t("activeSubscriptions")}
              value={formatNumber(activeSubscriptions.length)}
            />
            <StatTile
              icon={<CalendarOutlined />}
              label={t("nextCharge")}
              value={nextChargeHeadline}
              footer={
                nextActiveSubscription && (
                  <>
                    <p className="font-[family-name:var(--font-sub-inter)] text-xs text-[var(--sub-text-medium)]">
                      {t("nextChargeDetail", {
                        date: formatDate(`${toCalendarDate(nextActiveSubscription.nextPaymentDate)}T12:00:00`, { month: "short", day: "numeric" }),
                        title: nextActiveSubscription.name,
                      })}
                    </p>
                    <p className="font-[family-name:var(--font-sub-mono)] text-xs text-[var(--sub-text-low)]">
                      {t("nextChargeAmountLabel", {
                        amount: `${nextActiveSubscription.currency} ${formatNumber(Number(nextActiveSubscription.cost), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      })}
                    </p>
                  </>
                )
              }
            />
          </div>
        )}

        <div className="mb-3 flex gap-1.5 rounded-full border border-[var(--sub-border-subtle)] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setFilter(tab.key);
                setPage(1);
              }}
              className={`cursor-pointer rounded-full border px-3 py-1.5 font-[family-name:var(--font-sub-inter)] text-xs font-medium transition-colors ${
                filter === tab.key
                  ? "border-[var(--sub-border-active)] bg-[var(--sub-surface-tint-emerald)] text-[var(--sub-primary-light)]"
                  : "border-transparent text-[var(--sub-text-medium)] hover:border-[var(--sub-border-active)] hover:bg-[var(--sub-surface-tint-emerald)] hover:text-[var(--sub-primary-light)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-[16px] border border-[var(--sub-border-subtle)] bg-[var(--sub-surface-raised)] p-3.5 sm:p-4">
          {loading ? (
            <div aria-busy="true">
              <span className="sr-only" role="status" aria-live="polite">
                {t("loadingList")}
              </span>
              <div aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-5 border-b border-[var(--sub-border-subtle)] py-4 last:border-b-0"
                  >
                    <div className="flex-1">
                      <div className="h-4 w-40 max-w-[70%] animate-pulse rounded bg-white/[0.06]" />
                      <div className="mt-2 h-3 w-28 max-w-[50%] animate-pulse rounded bg-white/[0.06]" />
                    </div>
                    <div className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
                  </div>
                ))}
              </div>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <p className="max-w-sm font-[family-name:var(--font-sub-inter)] text-sm text-[var(--sub-text-medium)]">
                {t("noSubscriptionsYetHelp")}
              </p>
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <p className="max-w-sm font-[family-name:var(--font-sub-inter)] text-sm text-[var(--sub-text-medium)]">
                {t("noSubscriptionsForFilter")}
              </p>
            </div>
          ) : (
            <>
              <ul>
                {pagedSubscriptions.map((subscription) => {
                  const { icon: Icon } = categoryTokens(subscription.category);
                  const due = dueBadge(subscription);
                  const busy = busyId === subscription.id;

                  return (
                    <li
                      key={subscription.id}
                      className="border-b border-[var(--sub-border-subtle)] py-3 last:border-b-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--sub-surface-base)] text-lg text-[var(--sub-primary-light)]">
                            <Icon />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="truncate font-[family-name:var(--font-sub-jakarta)] text-[16px] font-semibold leading-6 text-[var(--sub-text-high)]">
                                {subscription.name}
                              </h3>
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 font-[family-name:var(--font-sub-inter)] text-[11px] font-medium ${
                                  subscription.isActive
                                    ? "border-[var(--sub-border-active)] bg-[var(--sub-surface-tint-emerald)] text-[var(--sub-primary-light)]"
                                    : "border-white/10 bg-white/[0.06] text-[var(--sub-text-medium)]"
                                }`}
                              >
                                {subscription.isActive ? t("active") : t("paused")}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2 py-0.5 font-[family-name:var(--font-sub-inter)] text-[11px] text-[var(--sub-text-medium)]">
                                {t(BILLING_CYCLE_LABEL_KEYS[subscription.billingCycle])}
                              </span>
                              {due && (
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-sub-inter)] text-[11px] font-medium ${
                                    due.overdue
                                      ? "border-[var(--sub-danger)]/25 bg-[var(--sub-danger)]/[0.12] text-[var(--sub-danger)]"
                                      : "border-[var(--sub-warning)]/25 bg-[var(--sub-warning)]/[0.12] text-[var(--sub-warning)]"
                                  }`}
                                >
                                  {due.label}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 font-[family-name:var(--font-sub-inter)] text-xs text-[var(--sub-text-medium)]">
                              {t("nextChargeOn", { date: displayDate(subscription.nextPaymentDate) })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-[family-name:var(--font-sub-mono)] text-[13px] font-medium tracking-[-0.01em] tabular-nums text-[var(--sub-text-high)]">
                            {subscription.currency} {formatNumber(Number(subscription.cost), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(subscription)}
                              className={`${PILL_SECONDARY} h-8 px-3.5 font-[family-name:var(--font-sub-inter)] text-xs`}
                            >
                              {t("edit")}
                            </button>
                            {subscription.isActive ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void pauseSubscription(subscription.id)}
                                className={`${PILL_DESTRUCTIVE} h-8 px-3.5 font-[family-name:var(--font-sub-inter)] text-xs`}
                              >
                                {busy ? t("pausing") : t("pause")}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void resumeSubscription(subscription.id)}
                                className={`${PILL_SECONDARY} h-8 px-3.5 font-[family-name:var(--font-sub-inter)] text-xs`}
                              >
                                {busy ? t("resuming") : t("resume")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--sub-border-subtle)] pt-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="font-[family-name:var(--font-sub-inter)] text-xs text-[var(--sub-text-medium)]">
                    {filteredSubscriptions.length === 0
                      ? t("noRecords")
                      : t("showingRecords", {
                          start: formatNumber(pageStartIndex),
                          end: formatNumber(pageEndIndex),
                          total: formatNumber(filteredSubscriptions.length),
                          records: t(filteredSubscriptions.length === 1 ? "record" : "records"),
                        })}
                  </span>
                  {pagedSubscriptions.length > 0 && (
                    <span className="font-[family-name:var(--font-sub-mono)] text-xs text-[var(--sub-text-low)]">
                      {t("visibleBatchTotal", {
                        amount: `${currencyLabel} ${formatNumber(batchSum, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    aria-label={t("rowsPerPage")}
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="h-8 rounded-[8px] border border-white/10 bg-[var(--sub-surface-base)] px-2 font-[family-name:var(--font-sub-inter)] text-xs text-[var(--sub-text-high)] outline-none transition-colors focus:border-[var(--sub-primary)] focus:ring-1 focus:ring-[var(--sub-primary)]"
                  >
                    {pageSizeOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-[var(--sub-surface-base)] text-[var(--sub-text-high)]">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage(safePage - 1)}
                      aria-label={t("previous")}
                      className={`${PILL_SECONDARY} h-8 w-8`}
                    >
                      <LeftOutlined />
                    </button>
                    <span className="px-2 font-[family-name:var(--font-sub-inter)] text-xs font-medium text-[var(--sub-text-medium)]">
                      {t("pageOf", { page: formatNumber(safePage), total: formatNumber(totalPages) })}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage(safePage + 1)}
                      aria-label={t("next")}
                      className={`${PILL_SECONDARY} h-8 w-8`}
                    >
                      <RightOutlined />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingSubscription ? t("editSubscriptionTitle") : t("newSubscriptionTitle")}
        maxWidth="max-w-xl"
      >
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          {formOpen && (
            <SubscriptionForm
              subscription={editingSubscription}
              categories={categories}
              creditCards={creditCards}
              creditCardsLoading={creditCardsLoading}
              creditCardsError={creditCardsError}
              loading={saving}
              submitError={formError}
              onSubmit={(payload) => void saveSubscription(payload)}
              onCancel={closeForm}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
