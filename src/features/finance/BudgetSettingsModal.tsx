"use client";

import { useState } from "react";
import { Input, InputNumber, Select } from "antd";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import {
  BUDGET_PERIODS,
  type BudgetPeriod,
  type BudgetWritePayload,
} from "./finance.types";
import { parseMoneyInput } from "./moneyInput";

const PERIOD_LABEL_KEYS: Record<BudgetPeriod, MessageKey> = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  annual: "yearly",
  period: "budgetCustomRange",
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type BudgetSettingsInitial = {
  amount?: number;
  period?: BudgetPeriod;
  start?: string | null;
  end?: string | null;
};

export function BudgetSettingsModal({
  open,
  ...props
}: {
  open: boolean;
  initial: BudgetSettingsInitial;
  onClose: () => void;
  onSave: (payload: BudgetWritePayload) => void | Promise<void>;
  loading?: boolean;
  error?: string;
}) {
  if (!open) return null;
  return <OpenBudgetSettingsModal {...props} />;
}

function OpenBudgetSettingsModal({
  initial,
  onClose,
  onSave,
  loading = false,
  error,
}: Omit<Parameters<typeof BudgetSettingsModal>[0], "open">) {
  const { t, formatNumber } = useLocale();
  const hasBudget = (initial.amount ?? 0) > 0;
  const [amount, setAmount] = useState<number | null>(hasBudget ? initial.amount ?? null : null);
  const [period, setPeriod] = useState<BudgetPeriod>(hasBudget ? initial.period ?? "monthly" : "monthly");
  const [start, setStart] = useState(hasBudget && initial.period === "period" ? initial.start ?? "" : "");
  const [end, setEnd] = useState(hasBudget && initial.period === "period" ? initial.end ?? "" : "");

  const amountValid = amount != null && Number.isFinite(amount) && amount > 0;
  const datesPresent = DATE_ONLY.test(start) && DATE_ONLY.test(end);
  const rangeInvalid = period === "period" && datesPresent && end < start;
  const isValid =
    amountValid && (period !== "period" || (datesPresent && !rangeInvalid));

  const closeIfIdle = () => {
    if (!loading) onClose();
  };

  const submit = () => {
    if (!isValid || amount == null) return;
    // Mirrors the mobile payload: dates are only sent for the custom range.
    void onSave(
      period === "period"
        ? { budgetAmount: amount, budgetPeriod: period, budgetPeriodStart: start, budgetPeriodEnd: end }
        : { budgetAmount: amount, budgetPeriod: period },
    );
  };

  const validationMessage = !amountValid && amount != null
    ? t("budgetAmountInvalid")
    : rangeInvalid
      ? t("budgetEndBeforeStart")
      : period === "period" && !datesPresent && (start || end)
        ? t("budgetDatesRequired")
        : undefined;

  return (
    <Modal open onClose={closeIfIdle} title={t("budgetSettingsTitle")}>
      <div className="space-y-3">
        <div>
          <label htmlFor="budget-amount" className="mb-1 block text-xs text-[var(--text-3)]">
            {t("budgetAmountLabel")}
          </label>
          <InputNumber<number>
            id="budget-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={setAmount}
            formatter={(value, info) =>
              info.userTyping
                ? info.input
                : Number.isFinite(Number(value))
                  ? formatNumber(Number(value), {
                      useGrouping: true,
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : ""
            }
            parser={parseMoneyInput}
            controls={false}
            min={0}
            precision={2}
            style={{ width: "100%" }}
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="budget-period" className="mb-1 block text-xs text-[var(--text-3)]">
            {t("budgetPeriodLabel")}
          </label>
          <Select<BudgetPeriod>
            id="budget-period"
            value={period}
            onChange={setPeriod}
            style={{ width: "100%" }}
            options={BUDGET_PERIODS.map((value) => ({
              value,
              label: t(PERIOD_LABEL_KEYS[value]),
            }))}
          />
        </div>
        {period === "period" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="budget-start" className="mb-1 block text-xs text-[var(--text-3)]">
                {t("budgetPeriodStartLabel")}
              </label>
              <Input id="budget-start" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
            </div>
            <div>
              <label htmlFor="budget-end" className="mb-1 block text-xs text-[var(--text-3)]">
                {t("budgetPeriodEndLabel")}
              </label>
              <Input id="budget-end" type="date" value={end} min={start || undefined} onChange={(event) => setEnd(event.target.value)} />
            </div>
          </div>
        )}
        {(validationMessage || error) && (
          <p role="alert" className="text-sm text-[var(--rose)]">
            {validationMessage ?? error}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        {hasBudget ? (
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            className="!text-[var(--rose)]"
            onClick={() => void onSave({ budgetAmount: 0 })}
          >
            {t("removeBudget")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={closeIfIdle} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="success" onClick={submit} disabled={loading || !isValid} aria-busy={loading}>
            {loading ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
