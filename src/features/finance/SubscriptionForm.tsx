"use client";

import { useState } from "react";
import { DatePicker, Form, Input, InputNumber, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { Category } from "./finance.types";
import type { CreditCardSummary } from "./statement-import.types";
import {
  BILLING_CYCLE_VALUES,
  SUBSCRIPTION_PAYMENT_METHOD_VALUES,
  type BillingCycle,
  type CreateSubscriptionPayload,
  type Subscription,
} from "./subscriptions.types";
import { Button } from "@/components/ui/Button";
import { CreditCardsSkeleton } from "@/components/ui/ContentSkeleton";
import { categoryLabel } from "./categoryVisuals";
import { CreditCardPicker } from "./CreditCardPicker";
import { useLocale } from "@/i18n/LocaleProvider";

export const BILLING_CYCLE_LABEL_KEYS = {
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

// A separate, freshly-mounted component per modal open (same convention as
// ExpenseForm) so a bare Form.useForm() + initialValues fully resets between
// "New subscription" and editing different rows — no imperative
// resetFields()/setFieldsValue() bookkeeping needed on the parent.
export function SubscriptionForm({
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
    /** YYYY-MM-DD; defaults to one month from today. */
    nextPaymentDate?: string;
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
                nextPaymentDate: prefill.nextPaymentDate ? dayjs(prefill.nextPaymentDate) : dayjs().add(1, "month"),
                paymentMethod: prefill.paymentMethod ?? "CREDIT_CARD",
                categoryId: prefill.categoryId ?? undefined,
                reminderDays: 3,
              }
            : { currency: "MXN", billingCycle: "MONTHLY", paymentMethod: "CREDIT_CARD", reminderDays: 3 }
      }
      onFinish={submit}
    >
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
            label: categoryLabel(category),
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
      {displayedError && (
        <div
          role="alert"
          className="mt-4 mb-3 rounded-lg border border-[var(--rose)]/30 bg-[var(--rose)]/10 px-3 py-2 text-sm text-[var(--rose)]"
        >
          {displayedError}
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
