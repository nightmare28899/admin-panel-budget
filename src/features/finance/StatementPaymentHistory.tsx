"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useLocale } from "@/i18n/LocaleProvider";
import type { StatementPayment } from "./statement-import.types";

export function StatementPaymentHistory({
  payments,
  loading,
  onCorrect,
  onVoid,
}: {
  payments: StatementPayment[];
  loading: boolean;
  onCorrect: (payment: StatementPayment) => void;
  onVoid: (payment: StatementPayment, reason: string) => Promise<void>;
}) {
  const { t, formatDate, formatNumber } = useLocale();
  const [voidTarget, setVoidTarget] = useState<StatementPayment>();
  const [reason, setReason] = useState("");
  const correctedPaymentIds = new Set(
    payments.flatMap((payment) =>
      payment.supersedesId ? [payment.supersedesId] : [],
    ),
  );

  return (
    <Card title={t("paymentHistory")} className="mb-4 !p-5">
      {payments.length === 0 ? (
        <p className="text-sm text-[var(--text-3)]">{t("noPaymentsRecorded")}</p>
      ) : (
        <ul className="divide-y divide-[var(--border-soft)]">
          {payments.map((payment) => {
            const historyStatus = correctedPaymentIds.has(payment.id)
              ? "corrected"
              : payment.voidedAt
                ? "voided"
                : "active";
            return (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-[var(--text-1)]">
                    {payment.currency} {formatNumber(Number(payment.amount), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <Badge variant={historyStatus === "active" ? "success" : historyStatus === "corrected" ? "info" : "neutral"}>
                    {t(historyStatus)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--text-3)]">{formatDate(payment.paidAt, { dateStyle: "medium" })}</p>
                {payment.note && <p className="mt-1 text-xs text-[var(--text-2)]">{payment.note}</p>}
                {payment.voidReason && <p className="mt-1 text-xs text-[var(--text-3)]">{t("voidReasonLabel", { reason: payment.voidReason })}</p>}
              </div>
              {!payment.voidedAt && (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => onCorrect(payment)}>
                    {t("correct")}
                  </Button>
                  <Button type="button" size="sm" variant="danger" disabled={loading} onClick={() => setVoidTarget(payment)}>
                    {t("voidPayment")}
                  </Button>
                </div>
              )}
            </li>
            );
          })}
        </ul>
      )}
      {voidTarget && (
        <div className="mt-4">
          <label htmlFor="void-payment-reason" className="mb-1 block text-xs text-[var(--text-3)]">{t("voidReason")}</label>
          <textarea id="void-payment-reason" value={reason} maxLength={500} className="min-h-20 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-3)] p-2 text-sm" onChange={(event) => setReason(event.target.value)} />
        </div>
      )}
      <ConfirmModal
        open={Boolean(voidTarget)}
        onClose={() => { setVoidTarget(undefined); setReason(""); }}
        onConfirm={async () => {
          if (!voidTarget || !reason.trim()) return;
          await onVoid(voidTarget, reason.trim());
          setVoidTarget(undefined);
          setReason("");
        }}
        title={t("voidPaymentQuestion")}
        description={t("voidPaymentDescription")}
        confirmLabel={t("voidPayment")}
        confirmVariant="danger"
        loading={loading}
      />
    </Card>
  );
}
