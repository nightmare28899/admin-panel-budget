"use client";

import { useState } from "react";
import { Input, InputNumber, Space } from "antd";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/i18n/LocaleProvider";

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

// Reads amounts formatted in either locale ("4.245,99", "4,245.99") or typed
// raw ("4245.99", "4245,99"). A lone separator followed by at most two digits
// is the decimal mark; anything else is grouping.
function parseMoneyInput(text: string | undefined): number {
  const cleaned = (text ?? "").replace(/[^\d.,-]/g, "");
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let decimalMark: "." | "," | null = null;
  if (lastDot !== -1 && lastComma !== -1) {
    decimalMark = lastDot > lastComma ? "." : ",";
  } else {
    const mark = lastDot !== -1 ? "." : lastComma !== -1 ? "," : null;
    if (mark && cleaned.split(mark).length === 2 && /^\d{1,2}$/.test(cleaned.split(mark)[1])) {
      decimalMark = mark;
    }
  }
  const normalized = decimalMark
    ? cleaned
        .split(decimalMark)
        .map((part, index, parts) =>
          index === parts.length - 1 ? part : part.replace(/[.,]/g, ""),
        )
        .join(".")
    : cleaned.replace(/[.,]/g, "");
  return Number(normalized);
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
      <p className="text-sm leading-6 text-[var(--text-2)]">{t("recordPaymentPrompt")}</p>
      <div className="space-y-3">
        <div>
          <label htmlFor="statement-payment-amount" className="mb-1 block text-xs text-[var(--text-3)]">
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
          <label htmlFor="statement-payment-date" className="mb-1 block text-xs text-[var(--text-3)]">
            {t("paymentDate")}
          </label>
          <Input id="statement-payment-date" type="date" max={today()} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
        </div>
        <div>
          <label htmlFor="statement-payment-note" className="mb-1 block text-xs text-[var(--text-3)]">
            {t("paymentNote")}
          </label>
          <Input.TextArea id="statement-payment-note" value={note} maxLength={500} rows={2} onChange={(event) => setNote(event.target.value)} />
        </div>
        {correction && (
          <div>
            <label htmlFor="statement-payment-reason" className="mb-1 block text-xs text-[var(--text-3)]">
              {t("correctionReason")}
            </label>
            <Input.TextArea id="statement-payment-reason" value={reason} maxLength={500} rows={2} required onChange={(event) => setReason(event.target.value)} />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={closeIfIdle} disabled={loading}>
          {t("cancel")}
        </Button>
        <Button
          type="button"
          variant="success"
          className="!h-auto min-h-10 min-w-0 max-w-full !whitespace-normal break-words px-4 py-2 text-center leading-tight"
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
        </Button>
      </div>
    </Modal>
  );
}
