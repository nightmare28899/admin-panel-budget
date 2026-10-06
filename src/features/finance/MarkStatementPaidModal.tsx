"use client";

import { useState } from "react";
import { Input, InputNumber, Space } from "antd";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/i18n/LocaleProvider";
import { parseMoneyInput } from "./moneyInput";
import { EARLIEST_PAYMENT_DATE, isOverpayment, localToday, validatePaymentDraft } from "./statementPaymentRules";
import { StatementButton, STATEMENT_FIELD_SCOPE } from "./StatementUi";

export type StatementPaymentFormValue = {
  amount: number;
  currency: string;
  paidAt: string;
  note?: string;
  reason?: string;
};

type MarkStatementPaidModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: StatementPaymentFormValue) => void | Promise<void>;
  defaultAmount?: number | null;
  defaultCurrency?: string | null;
  defaultPaidAt?: string;
  defaultNote?: string | null;
  correction?: boolean;
  loading?: boolean;
  /** Preset amounts offered as chips (remaining, minimum, no-interest...). */
  quickAmounts?: Array<{ key: string; label: string; amount: number }>;
  /** Pending amount of the statement; when set, paying more asks for an explicit confirmation. */
  remaining?: number | null;
  /** Server-side failure to show inside the dialog. */
  errorMessage?: string;
};

export function MarkStatementPaidModal({
  open,
  ...props
}: MarkStatementPaidModalProps) {
  if (!open) return null;

  return (
    <OpenStatementPaymentModal
      key={`${props.defaultCurrency ?? ""}:${props.defaultAmount ?? ""}:${props.defaultPaidAt ?? ""}:${props.correction ?? false}`}
      {...props}
    />
  );
}

function OpenStatementPaymentModal({
  onClose,
  onConfirm,
  defaultAmount,
  defaultCurrency,
  defaultPaidAt,
  defaultNote,
  correction = false,
  loading = false,
  quickAmounts = [],
  remaining,
  errorMessage,
}: Omit<MarkStatementPaidModalProps, "open">) {
  const { t, formatNumber } = useLocale();
  const today = localToday();
  const [amount, setAmount] = useState<number | null>(defaultAmount ?? null);
  const currency = defaultCurrency ?? "";
  const [paidAt, setPaidAt] = useState(defaultPaidAt?.slice(0, 10) ?? today);
  const [note, setNote] = useState(defaultNote ?? "");
  const [reason, setReason] = useState("");
  const [overpayAcknowledged, setOverpayAcknowledged] = useState(false);
  const validationKey = validatePaymentDraft({ amount, paidAt, currency, statementCurrency: currency }, today);
  const isValid = validationKey === null && (!correction || Boolean(reason.trim()));
  const overpaying = amount != null && validationKey === null && isOverpayment(amount, remaining);
  const awaitingOverpayConfirm = overpaying && overpayAcknowledged;
  const formatPlain = (value: number) =>
    formatNumber(value, { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const changeAmount = (value: number | null) => {
    setAmount(value);
    setOverpayAcknowledged(false);
  };

  const closeIfIdle = () => {
    if (!loading) onClose();
  };

  return (
    <Modal open onClose={closeIfIdle} title={t(correction ? "correctPayment" : "recordPayment")}>
      <p className="text-sm leading-6 text-slate-300">{t("recordPaymentPrompt")}</p>
      <div className={`space-y-3 ${STATEMENT_FIELD_SCOPE}`}>
        <div>
          <label htmlFor="statement-payment-amount" className="mb-1 block text-xs text-slate-400">
            {t("paymentAmount")}
          </label>
          <Space.Compact block className="min-w-0 max-w-full">
            <Input
              aria-label={t("currency")}
              value={currency}
              maxLength={3}
              readOnly
              className="!w-20 shrink-0"
            />
            <InputNumber<number>
              id="statement-payment-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={changeAmount}
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
              min={0.01}
              precision={2}
              className="min-w-0 flex-1"
              style={{ width: "100%", minWidth: 0 }}
              autoFocus
            />
          </Space.Compact>
          {quickAmounts.length > 0 && (
            <div role="group" aria-label={t("cardAbonoQuickAmounts")} className="mt-2 flex flex-wrap gap-1.5">
              {quickAmounts.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  disabled={loading}
                  onClick={() => changeAmount(chip.amount)}
                  className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-60 ${
                    amount === chip.amount
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                      : "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {chip.label} · <span className="font-mono">{formatPlain(chip.amount)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label htmlFor="statement-payment-date" className="mb-1 block text-xs text-slate-400">
            {t("paymentDate")}
          </label>
          <Input id="statement-payment-date" type="date" min={EARLIEST_PAYMENT_DATE} max={today} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
        </div>
        <div>
          <label htmlFor="statement-payment-note" className="mb-1 block text-xs text-slate-400">
            {t("paymentNote")}
          </label>
          <Input.TextArea id="statement-payment-note" value={note} maxLength={500} rows={2} onChange={(event) => setNote(event.target.value)} />
        </div>
        {correction && (
          <div>
            <label htmlFor="statement-payment-reason" className="mb-1 block text-xs text-slate-400">
              {t("correctionReason")}
            </label>
            <Input.TextArea id="statement-payment-reason" value={reason} maxLength={500} rows={2} required onChange={(event) => setReason(event.target.value)} />
          </div>
        )}
      </div>
      {amount != null && validationKey && (
        <p role="alert" className="text-xs text-rose-400">{t(validationKey)}</p>
      )}
      {awaitingOverpayConfirm && (
        <p role="alert" className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          {t("cardAbonoOverpayWarning", { remaining: formatPlain(remaining ?? 0) })}
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="rounded-lg border border-rose-500/25 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">{errorMessage}</p>
      )}
      <div className="flex min-w-0 flex-wrap justify-end gap-2 pt-2">
        <StatementButton variant="ghost" size="md" onClick={closeIfIdle} disabled={loading}>
          {t("cancel")}
        </StatementButton>
        <StatementButton
          variant="pay"
          size="md"
          className="!h-auto min-h-10 min-w-0 max-w-full !whitespace-normal break-words py-2 text-center leading-tight"
          onClick={() => {
            if (!isValid || amount == null) return;
            if (overpaying && !overpayAcknowledged) {
              setOverpayAcknowledged(true);
              return;
            }
            void onConfirm({
              amount,
              currency,
              paidAt: `${paidAt}T12:00:00.000Z`,
              note: note.trim() || undefined,
              reason: reason.trim() || undefined,
            });
          }}
          disabled={loading || !isValid}
          aria-busy={loading}
        >
          {loading
            ? t("working")
            : awaitingOverpayConfirm
              ? t("cardAbonoOverpayConfirm")
              : t(correction ? "correctPayment" : "recordPayment")}
        </StatementButton>
      </div>
    </Modal>
  );
}
