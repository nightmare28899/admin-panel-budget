"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { DatePicker, Form, Input, InputNumber, List, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { CalendarOutlined, RocketOutlined, WalletOutlined } from "@ant-design/icons";
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
  deleteSubscriptionAction,
  getCategoriesAction,
  getSubscriptionsAction,
  getUserMeAction,
  linkExpensesToSubscriptionAction,
  updateSubscriptionAction,
} from "@/lib/userActions";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { CreditCardsSkeleton } from "@/components/ui/ContentSkeleton";
import { categoryTokens } from "./categoryVisuals";
import { CreditCardPicker } from "./CreditCardPicker";
import { ChargeGroupDetail } from "./ChargeGroupDetail";
import { fetchAllExpensesForCategory, groupCharges, type ChargeGroup } from "./subscriptionCharges";
import { useCreditCards } from "./hooks/useCreditCards";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";
import { buildPagination } from "@/lib/pagination";

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

// Local aliases inherit the active workspace palette, including portaled forms.
const THEME_STYLE = {
  "--sub-canvas": "var(--bg-0)",
  "--sub-surface-base": "var(--bg-1)",
  "--sub-surface-raised": "var(--bg-1)",
  "--sub-surface-overlay": "var(--bg-3)",
  "--sub-surface-tint-emerald": "var(--accent-dim)",
  "--sub-primary": "var(--accent)",
  "--sub-primary-subtle": "var(--accent)",
  "--sub-primary-light": "var(--accent-text)",
  "--sub-secondary": "var(--info-text)",
  "--sub-danger": "var(--rose-text)",
  "--sub-warning": "var(--gold-text)",
  "--sub-text-high": "var(--text-1)",
  "--sub-text-medium": "var(--text-2)",
  "--sub-text-low": "var(--text-3)",
  "--sub-border-subtle": "var(--border-soft)",
  "--sub-border-active": "var(--accent)",
} as CSSProperties;


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
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--bg-3)]" />
        <div className="h-7 w-7 shrink-0 animate-pulse rounded-[8px] bg-[var(--bg-3)]" />
      </div>
      <div className="mt-3 h-7 w-28 animate-pulse rounded bg-[var(--bg-3)]" />
    </div>
  );
}

// A separate, freshly-mounted component per modal open (same convention as
// ExpenseForm) so a bare Form.useForm() + initialValues fully resets between
// "New subscription" and editing different rows — no imperative
// resetFields()/setFieldsValue() bookkeeping needed on the parent.
function SubscriptionForm({
  subscription,
  prefill,
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
  /** Seeds the form from a detected recurring charge group when creating a subscription from it — ignored when editing an existing `subscription`. */
  prefill?: {
    name: string;
    cost: number;
    currency: string;
    categoryId?: string | null;
    paymentMethod?: string;
    creditCardId?: string | null;
  };
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
    subscription?.creditCardId ?? prefill?.creditCardId ?? undefined,
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
          : prefill
            ? {
                name: prefill.name,
                cost: prefill.cost,
                currency: prefill.currency,
                billingCycle: "MONTHLY",
                nextPaymentDate: dayjs().add(1, "month"),
                paymentMethod: prefill.paymentMethod ?? "CREDIT_CARD",
                categoryId: prefill.categoryId ?? undefined,
                reminderDays: 3,
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
  const [deleteTarget, setDeleteTarget] = useState<Subscription>();
  const [deletingSubscription, setDeletingSubscription] = useState(false);
  const [chargeGroups, setChargeGroups] = useState<ChargeGroup[]>([]);
  const [linkedChargesBySubscriptionId, setLinkedChargesBySubscriptionId] = useState<
    Map<string, ChargeGroup>
  >(new Map());
  const [chargesError, setChargesError] = useState<string>();
  const [noChargesCategory, setNoChargesCategory] = useState(false);
  const [linkingGroup, setLinkingGroup] = useState<ChargeGroup>();

  const { cards: creditCards, cardsError: creditCardsError, loading: creditCardsLoading } = useCreditCards();

  const loadCharges = useCallback(async (loadedCategories: Category[]) => {
    const categoryLabel = t("subscriptionCategoryLabel");
    const chargesCategory = loadedCategories.find(
      (candidate) => candidate.name.trim().toLocaleLowerCase() === categoryLabel.trim().toLocaleLowerCase(),
    );

    if (!chargesCategory) {
      setNoChargesCategory(true);
      setChargeGroups([]);
      setLinkedChargesBySubscriptionId(new Map());
      return;
    }
    setNoChargesCategory(false);

    const result = await fetchAllExpensesForCategory(chargesCategory.id);
    if (result.error) {
      setChargesError(frontendError(result.error, t, "requestFailedGeneric"));
      return;
    }
    setChargesError(undefined);

    // Expense.subscriptionId is the real link once "Convertir en suscripción"
    // has run on a group — only charges still missing that link are
    // genuinely unmatched "leftover" groups; the rest render inline under
    // the subscription they were explicitly attached to.
    const unlinked = result.expenses.filter((expense) => !expense.subscriptionId);
    const linked = result.expenses.filter((expense) => expense.subscriptionId);
    setChargeGroups(groupCharges(unlinked));

    const bySubscriptionId = new Map<string, ChargeGroup>();
    for (const expense of linked) {
      const subscriptionId = expense.subscriptionId!;
      const existing = bySubscriptionId.get(subscriptionId);
      if (existing) existing.charges.push(expense);
      else bySubscriptionId.set(subscriptionId, { key: subscriptionId, displayName: expense.title, charges: [expense] });
    }
    for (const group of bySubscriptionId.values()) {
      group.charges.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    }
    setLinkedChargesBySubscriptionId(bySubscriptionId);
  }, [t]);

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
    void loadCharges(cats.data ?? []);
  }, [router, t, loadCharges]);

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
    setLinkingGroup(undefined);
    setFormError(undefined);
  };

  const startConvert = (group: ChargeGroup) => {
    setEditingSubscription(undefined);
    setFormError(undefined);
    setLinkingGroup(group);
    setFormOpen(true);
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
    if (!editingSubscription && linkingGroup && result.data) {
      await linkExpensesToSubscriptionAction(
        result.data.id,
        linkingGroup.charges.map((charge) => charge.id),
      );
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

  const confirmDeleteSubscription = async () => {
    if (!deleteTarget) return;
    setDeletingSubscription(true);
    const result = await deleteSubscriptionAction(deleteTarget.id);
    setDeletingSubscription(false);
    if (result.error) {
      setError(frontendError(result.error, t, "requestFailedGeneric"));
      setDeleteTarget(undefined);
      return;
    }
    setDeleteTarget(undefined);
    void reload();
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

  // A subscription plan and its charge history are linked by Expense.subscriptionId
  // (set once someone runs "Convertir en suscripción" on a detected group).
  // Charges still missing that link have no active/paused state, so they ride
  // along in every tab instead of being tied to the active/paused filter —
  // one single list instead of a second table underneath.
  const unmatchedChargeGroups = chargeGroups;

  type SubscriptionRow =
    | { type: "subscription"; subscription: Subscription }
    | { type: "chargeOnly"; group: ChargeGroup };
  type SubscriptionListEntry = SubscriptionRow | { type: "skeleton"; index: number };
  const SKELETON_ENTRIES: SubscriptionListEntry[] = Array.from({ length: 5 }, (_, index) => ({ type: "skeleton", index }));
  const combinedRows: SubscriptionRow[] = [
    ...filteredSubscriptions.map((subscription): SubscriptionRow => ({ type: "subscription", subscription })),
    ...unmatchedChargeGroups.map((group): SubscriptionRow => ({ type: "chargeOnly", group })),
  ];

  // Client-side pagination over the combined list — same fixed page size
  // pattern used by ExpenseList/the previous version of this view.
  const totalPages = Math.max(1, Math.ceil(combinedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = combinedRows.slice((safePage - 1) * pageSize, (safePage - 1) * pageSize + pageSize);
  const batchSum = pagedRows.reduce(
    (sum, row) => (row.type === "subscription" ? sum + Number(row.subscription.cost) : sum),
    0,
  );

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
      <div className="w-full p-4 sm:p-6 lg:p-8">
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
          <Button
            variant="tinted"
            size="sm"
            type="button"
            onClick={openCreate}
            className="!h-9 !px-4 font-[family-name:var(--font-sub-inter)] text-xs"
          >
            {t("newSubscription")}
          </Button>
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

        <List<SubscriptionListEntry>
          bordered
          dataSource={loading ? SKELETON_ENTRIES : pagedRows}
          rowKey={(entry) => (entry.type === "skeleton" ? `skeleton-${entry.index}` : entry.type === "chargeOnly" ? `charge-${entry.group.key}` : entry.subscription.id)}
          locale={{
            emptyText: (
              <p className="mx-auto max-w-sm py-8 font-[family-name:var(--font-sub-inter)] text-sm text-[var(--sub-text-medium)]">
                {subscriptions.length === 0 && chargeGroups.length === 0 ? t("noSubscriptionsYetHelp") : t("noSubscriptionsForFilter")}
              </p>
            ),
          }}
          footer={
            !loading && pagedRows.some((row) => row.type === "subscription") ? (
              <span className="font-[family-name:var(--font-sub-mono)] text-xs text-[var(--sub-text-low)]">
                {t("visibleBatchTotal", {
                  amount: `${currencyLabel} ${formatNumber(batchSum, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                })}
              </span>
            ) : undefined
          }
          pagination={
            loading || combinedRows.length === 0
              ? false
              : buildPagination({
                  t, formatNumber, current: safePage, pageSize, total: combinedRows.length,
                  recordKeys: { one: "subscriptionRecord", other: "subscriptionRecords" },
                  onChange: (nextPage, nextPageSize) => { setPageSize(nextPageSize); setPage(nextPage); },
                })
          }
          renderItem={(row) => {
            if (row.type === "skeleton") {
              return (
                <List.Item key={`skeleton-${row.index}`} aria-hidden="true">
                  <div className="flex-1">
                    <div className="h-4 w-40 max-w-[70%] animate-pulse rounded bg-[var(--bg-3)]" />
                    <div className="mt-2 h-3 w-28 max-w-[50%] animate-pulse rounded bg-[var(--bg-3)]" />
                  </div>
                  <div className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-[var(--bg-3)]" />
                </List.Item>
              );
            }
                  if (row.type === "chargeOnly") {
                    return (
                      <List.Item key={`charge-${row.group.key}`} className="!block">
                        <ChargeGroupDetail
                          group={row.group}
                          categories={categories}
                          variant="standalone"
                          onChanged={() => void reload()}
                          onConvert={() => startConvert(row.group)}
                        />
                      </List.Item>
                    );
                  }

                  const subscription = row.subscription;
                  const { icon } = categoryTokens(subscription.category);
                  const FallbackIcon = icon.kind === "component" ? icon.component : undefined;
                  const due = dueBadge(subscription);
                  const busy = busyId === subscription.id;
                  const matchedGroup = linkedChargesBySubscriptionId.get(subscription.id);

                  return (
                    <List.Item key={subscription.id} className="!block">
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--sub-surface-base)] text-lg text-[var(--sub-primary-light)]">
                            {icon.kind === "glyph" ? icon.glyph : FallbackIcon && <FallbackIcon />}
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
                                    : "border-[var(--border-soft)] bg-[var(--bg-3)] text-[var(--sub-text-medium)]"
                                }`}
                              >
                                {subscription.isActive ? t("active") : t("paused")}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-[var(--bg-3)] px-2 py-0.5 font-[family-name:var(--font-sub-inter)] text-[11px] text-[var(--sub-text-medium)]">
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
                        <span className="shrink-0 font-[family-name:var(--font-sub-mono)] text-[13px] font-medium tracking-[-0.01em] tabular-nums text-[var(--sub-text-high)]">
                          {subscription.currency} {formatNumber(Number(subscription.cost), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="mt-2.5 flex justify-end gap-2 border-t border-[var(--sub-border-subtle)] pt-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => openEdit(subscription)}
                          className="!h-8 !px-3.5 font-[family-name:var(--font-sub-inter)] text-xs"
                        >
                          {t("edit")}
                        </Button>
                        {subscription.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            disabled={busy}
                            onClick={() => void pauseSubscription(subscription.id)}
                            className="!h-8 !px-3.5 font-[family-name:var(--font-sub-inter)] text-xs text-[var(--rose)] hover:text-[var(--rose)]"
                          >
                            {busy ? t("pausing") : t("pause")}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            disabled={busy}
                            onClick={() => void resumeSubscription(subscription.id)}
                            className="!h-8 !px-3.5 font-[family-name:var(--font-sub-inter)] text-xs"
                          >
                            {busy ? t("resuming") : t("resume")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setDeleteTarget(subscription)}
                          className="!h-8 !px-3.5 font-[family-name:var(--font-sub-inter)] text-xs text-[var(--rose)] hover:text-[var(--rose)]"
                        >
                          {t("deleteSubscription")}
                        </Button>
                      </div>
                      {matchedGroup && (
                        <div className="mt-2.5 rounded-xl border border-[var(--sub-border-subtle)] bg-[var(--sub-surface-base)]/60 p-2.5">
                          <ChargeGroupDetail
                            group={matchedGroup}
                            categories={categories}
                            variant="inline"
                            onChanged={() => void reload()}
                          />
                        </div>
                      )}
                    </List.Item>
                  );
                
          }}
        />
        {loading && (
          <span className="sr-only" role="status" aria-live="polite">
            {t("loadingList")}
          </span>
        )}

        {chargesError && (
          <p className="mt-3 font-[family-name:var(--font-sub-inter)] text-xs text-[var(--sub-danger)]">{chargesError}</p>
        )}
        {noChargesCategory && (
          <p className="mt-3 font-[family-name:var(--font-sub-inter)] text-xs text-[var(--sub-text-medium)]">
            {t("noSubscriptionCategory", { category: t("subscriptionCategoryLabel") })}
          </p>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingSubscription ? t("editSubscriptionTitle") : linkingGroup ? t("convertToSubscription") : t("newSubscriptionTitle")}
        maxWidth="max-w-xl"
      >
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          {formOpen && (
            <SubscriptionForm
              subscription={editingSubscription}
              prefill={
                linkingGroup
                  ? {
                      name: linkingGroup.displayName,
                      cost: Number(linkingGroup.charges[0].cost),
                      currency: linkingGroup.charges[0].currency,
                      categoryId: linkingGroup.charges[0].categoryId ?? linkingGroup.charges[0].category?.id,
                      paymentMethod: linkingGroup.charges[0].creditCardId ? "CREDIT_CARD" : (linkingGroup.charges[0].paymentMethod ?? undefined),
                      creditCardId: linkingGroup.charges[0].creditCardId,
                    }
                  : undefined
              }
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

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={confirmDeleteSubscription}
        title={t("deleteSubscriptionQuestion")}
        description={deleteTarget ? t("deleteSubscriptionDescription", { name: deleteTarget.name }) : t("cannotUndo")}
        confirmLabel={t("deleteSubscription")}
        confirmingLabel={t("deleting")}
        confirmVariant="danger"
        loading={deletingSubscription}
      />
    </div>
  );
}
