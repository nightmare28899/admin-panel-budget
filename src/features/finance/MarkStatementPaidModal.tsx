"use client";

import { useState } from "react";
import { Input, InputNumber, Space } from "antd";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/i18n/LocaleProvider";
import { parseMoneyInput } from "./moneyInput";
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
};

// The viewer's calendar day; toISOString() would jump to tomorrow in the
// evening for negative UTC offsets (e.g. Mexico).
function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

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
}: Omit<MarkStatementPaidModalProps, "open">) {
  const { t, formatNumber } = useLocale();
  const [amount, setAmount] = useState<number | null>(defaultAmount ?? null);
  const currency = defaultCurrency ?? "";
  const [paidAt, setPaidAt] = useState(defaultPaidAt?.slice(0, 10) ?? today());
  const [note, setNote] = useState(defaultNote ?? "");
  const [reason, setReason] = useState("");
  const isValid =
    amount != null &&
    Number.isFinite(amount) &&
    amount >= 0.01 &&
    /^[A-Z]{3}$/.test(currency) &&
    Boolean(paidAt) &&
    (!correction || Boolean(reason.trim()));

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
              min={0.01}
              precision={2}
              className="min-w-0 flex-1"
              style={{ width: "100%", minWidth: 0 }}
              autoFocus
            />
          </Space.Compact>
        </div>
        <div>
          <label htmlFor="statement-payment-date" className="mb-1 block text-xs text-slate-400">
            {t("paymentDate")}
          </label>
          <Input id="statement-payment-date" type="date" max={today()} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
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
      <div className="flex min-w-0 flex-wrap justify-end gap-2 pt-2">
        <StatementButton variant="ghost" size="md" onClick={closeIfIdle} disabled={loading}>
          {t("cancel")}
        </StatementButton>
        <StatementButton
          variant="pay"
          size="md"
          className="!h-auto min-h-10 min-w-0 max-w-full !whitespace-normal break-words py-2 text-center leading-tight"
          onClick={() =>
            isValid &&
            void onConfirm({
              amount,
              currency,
              paidAt: `${paidAt}T12:00:00.000Z`,
              note: note.trim() || undefined,
              reason: reason.trim() || undefined,
            })
          }
          disabled={loading || !isValid}
          aria-busy={loading}
        >
          {loading ? t("working") : t(correction ? "correctPayment" : "recordPayment")}
        </StatementButton>
      </div>
    </Modal>
  );
}
