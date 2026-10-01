"use client";

import { useState } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useLocale } from "@/i18n/LocaleProvider";
import { StatementBadge, StatementButton, StatementSectionCard } from "./StatementUi";
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
    <StatementSectionCard title={t("paymentHistory")} className="mb-4">
      {payments.length === 0 ? (
        <p className="text-sm text-slate-400">{t("noPaymentsRecorded")}</p>
      ) : (
        <ul className="divide-y divide-slate-800/60">
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
                  <span className="font-mono text-sm font-bold text-white">
                    {payment.currency} {formatNumber(Number(payment.amount), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <StatementBadge tone={historyStatus === "active" ? "emerald" : historyStatus === "corrected" ? "sky" : "slate"}>
                    {t(historyStatus)}
                  </StatementBadge>
                </div>
                <p className="mt-1 text-xs text-slate-400">{formatDate(payment.paidAt, { dateStyle: "medium" })}</p>
                {payment.note && <p className="mt-1 text-xs text-slate-300">{payment.note}</p>}
                {payment.voidReason && <p className="mt-1 text-xs text-slate-400">{t("voidReasonLabel", { reason: payment.voidReason })}</p>}
              </div>
              {!payment.voidedAt && (
                <div className="flex gap-2">
                  <StatementButton variant="secondary" disabled={loading} onClick={() => onCorrect(payment)}>
                    {t("correct")}
                  </StatementButton>
                  <StatementButton variant="danger" disabled={loading} onClick={() => setVoidTarget(payment)}>
                    {t("voidPayment")}
                  </StatementButton>
                </div>
              )}
            </li>
            );
          })}
        </ul>
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
        confirmDisabled={!reason.trim()}
      >
        <div>
          <label htmlFor="void-payment-reason" className="mb-1 block text-xs text-slate-400">{t("voidReason")}</label>
          <textarea id="void-payment-reason" autoFocus value={reason} maxLength={500} className="min-h-20 w-full rounded-xl border border-slate-800 bg-[#0A0F19] p-2 text-sm text-slate-200 outline-none focus-visible:border-emerald-500/60" onChange={(event) => setReason(event.target.value)} />
        </div>
      </ConfirmModal>
    </StatementSectionCard>
  );
}
