"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { frontendError } from "@/i18n/errors";
import { useLocale } from "@/i18n/LocaleProvider";
import {
  correctStatementPaymentAction,
  createStatementPaymentAction,
  getStatementImportAction,
  voidStatementPaymentAction,
} from "@/lib/userActions";
import type { CreditCardOverviewItem } from "./credit-cards.types";
import { MarkStatementPaidModal, type StatementPaymentFormValue } from "./MarkStatementPaidModal";
import { StatementPaymentHistory } from "./StatementPaymentHistory";
import { StatementBadge } from "./StatementUi";
import type {
  StatementImportDetail,
  StatementPayment,
  StatementPaymentMutationResponse,
} from "./statement-import.types";
import { latestPayments, mapStatementPaymentError, paymentLedgerStatus } from "./statementPaymentRules";

const RECENT_PAYMENTS = 3;

type PaymentWriteResult = {
  data?: StatementPaymentMutationResponse;
  error?: string;
  sessionExpired?: boolean;
};

/**
 * Partial payments ("abonos") of a card's latest statement, driven from the
 * cards page. The overview already carries the totals (progress); the statement
 * detail (status, paymentVersion, targets, history) is fetched lazily on the
 * first interaction so loading the page costs no extra requests.
 */
export function CardStatementPayments({
  card,
  onChanged,
}: {
  card: CreditCardOverviewItem;
  /** Reload the overview; `notice` is shown as a success message. */
  onChanged: (notice?: string) => void | Promise<void>;
}) {
  const router = useRouter();
  const { t, formatNumber, formatDate } = useLocale();
  const summary = card.statementSummary;
  const statementId = summary.statementImportId;
  const [detail, setDetail] = useState<StatementImportDetail>();
  const [fetching, setFetching] = useState(false);
  const [writing, setWriting] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [paymentToCorrect, setPaymentToCorrect] = useState<StatementPayment>();
  const [error, setError] = useState<string>();
  const [modalError, setModalError] = useState<string>();

  if (!statementId || !card.isActive) return null;

  const money = (value: number, currency = card.currency) =>
    `${currency} ${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const isPaid = summary.paymentStatus === "PAID";
  const total = summary.closingBalance;
  const showProgress = total != null && total > 0 && summary.paidTotal > 0;
  const percent = total ? Math.min(100, Math.max(0, (summary.paidTotal / total) * 100)) : 0;
  const reviewHref = `/finance/statements/${statementId}`;
  const detailBlocksPayment =
    detail != null &&
    (detail.status !== "CONFIRMED" || !detail.reconciliation || !detail.paymentSummary.currency);
  const needsReview =
    summary.integrityFlags.missingReconciliation ||
    summary.integrityFlags.failedReconciliation ||
    detailBlocksPayment;
  const statementCurrency = detail?.paymentSummary.currency ?? card.currency;

  // Returns the fresh detail, or undefined after reporting why it failed.
  const loadDetail = async (): Promise<StatementImportDetail | undefined> => {
    setFetching(true);
    const result = await getStatementImportAction(statementId);
    setFetching(false);
    if (result.sessionExpired) {
      router.push("/user-login");
      return undefined;
    }
    if (result.error || !result.data) {
      setError(frontendError(result.error, t, "statementLoadFailed"));
      return undefined;
    }
    setDetail(result.data);
    return result.data;
  };

  const applyMutation = (data: StatementPaymentMutationResponse) =>
    setDetail((current) =>
      current
        ? {
            ...current,
            paymentVersion: data.paymentVersion,
            paymentSummary: data.summary,
            paymentStatus: data.summary.paymentStatus,
            isPaid: data.summary.isPaid,
            paymentHistory: data.history,
          }
        : current,
    );

  const showPaymentError = async (result: PaymentWriteResult) => {
    if (result.sessionExpired) {
      router.push("/user-login");
      return;
    }
    const info = mapStatementPaymentError(result.error);
    setModalError(info.key ? t(info.key) : frontendError(result.error, t, "paidStatusFailed"));
    if (info.refetch) {
      // The ledger may have moved on: refresh the version and the overview.
      await loadDetail();
      await onChanged();
    }
  };

  const openPayment = async () => {
    setError(undefined);
    setModalError(undefined);
    const current = detail ?? (await loadDetail());
    if (!current) return;
    if (current.status !== "CONFIRMED" || !current.reconciliation || !current.paymentSummary.currency) return;
    setPayOpen(true);
  };

  const openHistory = async () => {
    setError(undefined);
    setModalError(undefined);
    if (!detail && !(await loadDetail())) return;
    setHistoryOpen(true);
  };

  const recordPayment = async (value: StatementPaymentFormValue) => {
    if (!detail) return;
    setWriting(true);
    setModalError(undefined);
    const result = await createStatementPaymentAction(statementId, {
      amount: value.amount,
      currency: value.currency,
      paidAt: value.paidAt,
      note: value.note,
      expectedVersion: detail.paymentVersion,
      idempotencyKey: crypto.randomUUID(),
    });
    if (result.error || !result.data) {
      await showPaymentError(result);
      setWriting(false);
      return;
    }
    applyMutation(result.data);
    setWriting(false);
    setPayOpen(false);
    await onChanged(
      t("cardAbonoRecorded", {
        amount: money(value.amount, value.currency),
        remaining: money(result.data.summary.remainingStatement ?? 0, value.currency),
      }),
    );
  };

  const correctPayment = async (value: StatementPaymentFormValue) => {
    if (!detail || !paymentToCorrect || !value.reason) return;
    setWriting(true);
    setModalError(undefined);
    const result = await correctStatementPaymentAction(paymentToCorrect.id, {
      amount: value.amount,
      currency: value.currency,
      paidAt: value.paidAt,
      note: value.note,
      reason: value.reason,
      expectedVersion: detail.paymentVersion,
      idempotencyKey: crypto.randomUUID(),
    });
    if (result.error || !result.data) {
      await showPaymentError(result);
      setWriting(false);
      return;
    }
    applyMutation(result.data);
    setWriting(false);
    setPaymentToCorrect(undefined);
    await onChanged(t("paymentCorrected"));
  };

  const voidPayment = async (payment: StatementPayment, reason: string) => {
    if (!detail) return;
    setWriting(true);
    setModalError(undefined);
    const result = await voidStatementPaymentAction(payment.id, {
      expectedVersion: detail.paymentVersion,
      reason,
    });
    if (result.error || !result.data) {
      await showPaymentError(result);
      setWriting(false);
      return;
    }
    applyMutation(result.data);
    setWriting(false);
    await onChanged(t("paymentVoided"));
  };

  const paymentSummary = detail?.paymentSummary;
  const remaining = paymentSummary?.remainingStatement ?? summary.remainingStatement;
  const defaultAmount =
    paymentSummary && paymentSummary.currentPaymentDue != null && paymentSummary.currentPaymentDue > 0
      ? paymentSummary.currentPaymentDue
      : remaining > 0
        ? remaining
        : null;

  // Backend-computed targets, expressed as what is still missing to reach them.
  const quickAmounts: Array<{ key: string; label: string; amount: number }> = [];
  const addChip = (key: string, label: string, amount: number | null | undefined) => {
    if (amount == null || !(amount > 0)) return;
    const cents = Math.round(amount * 100);
    if (quickAmounts.some((chip) => Math.round(chip.amount * 100) === cents)) return;
    quickAmounts.push({ key, label, amount: cents / 100 });
  };
  if (paymentSummary) {
    addChip("noInterest", t("cardAbonoChipNoInterest"), paymentSummary.remainingNoInterest);
    for (const target of detail?.paymentTargets ?? []) {
      if (target.kind !== "MINIMUM" && target.kind !== "MINIMUM_PLUS_INSTALLMENTS") continue;
      addChip(
        target.id,
        t(target.kind === "MINIMUM" ? "cardAbonoChipMinimum" : "cardAbonoChipMinimumPlus"),
        Number(target.amount) - paymentSummary.paidTotal,
      );
    }
    addChip("remaining", t("cardAbonoChipRemaining"), paymentSummary.remainingStatement);
  }

  const recent = detail ? latestPayments(detail.paymentHistory, RECENT_PAYMENTS) : [];
  const statusTone = { active: "emerald", corrected: "sky", voided: "slate" } as const;

  return (
    <div className="mt-3 space-y-2.5 border-t border-slate-800/70 pt-3">
      {showProgress && total != null && (
        <div>
          <p className="font-mono text-[11px] text-slate-300">
            {t("cardAbonoProgress", {
              paid: money(summary.paidTotal),
              total: money(total),
              remaining: money(summary.remainingStatement),
            })}
          </p>
          <div
            role="progressbar"
            aria-label={t("cardAbonoProgressLabel")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800"
          >
            <div className="h-1 rounded-full bg-emerald-400" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {(!isPaid || (!detail && summary.paidTotal > 0)) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {!isPaid &&
          (needsReview ? (
            <Link
              href={reviewHref}
              className="inline-block rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              {t("cardAbonoReviewStatement")}
            </Link>
          ) : (
            <button
              type="button"
              disabled={fetching || writing}
              aria-busy={fetching}
              onClick={() => void openPayment()}
              className="cursor-pointer rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:from-cyan-500 hover:to-sky-500 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {fetching ? t("working") : t("cardAbonoRegister")}
            </button>
          ))}
          {!detail && summary.paidTotal > 0 && (
            <button
              type="button"
              disabled={fetching}
              onClick={() => void openHistory()}
              className="cursor-pointer text-[11px] font-semibold text-sky-400 hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-60"
            >
              {fetching ? t("working") : t("cardAbonoShowPayments")}
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-[11px] text-rose-400">{error}</p>
      )}

      {detail && recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-slate-400">{t("cardAbonoRecent")}</p>
            <button
              type="button"
              onClick={() => void openHistory()}
              className="cursor-pointer text-[11px] font-semibold text-sky-400 hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              {t("cardAbonoViewAll")}
            </button>
          </div>
          <ul className="mt-1 divide-y divide-slate-800/60">
            {recent.map((payment) => {
              const status = paymentLedgerStatus(payment, detail.paymentHistory);
              return (
                <li key={payment.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-[11px] text-slate-400">{formatDate(payment.paidAt, { dateStyle: "medium" })}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-200">{money(Number(payment.amount), payment.currency)}</span>
                    <StatementBadge tone={statusTone[status]} dot={false} className="!px-2 !py-0.5 !text-[10px]">
                      {t(status)}
                    </StatementBadge>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <MarkStatementPaidModal
        open={payOpen}
        onClose={() => {
          setPayOpen(false);
          setModalError(undefined);
        }}
        onConfirm={recordPayment}
        defaultAmount={defaultAmount}
        defaultCurrency={statementCurrency}
        quickAmounts={quickAmounts}
        remaining={remaining}
        errorMessage={modalError}
        loading={writing}
      />
      <MarkStatementPaidModal
        open={Boolean(paymentToCorrect)}
        onClose={() => {
          setPaymentToCorrect(undefined);
          setModalError(undefined);
        }}
        onConfirm={correctPayment}
        defaultAmount={paymentToCorrect ? Number(paymentToCorrect.amount) : undefined}
        defaultCurrency={paymentToCorrect?.currency}
        defaultPaidAt={paymentToCorrect?.paidAt}
        defaultNote={paymentToCorrect?.note}
        errorMessage={modalError}
        correction
        loading={writing}
      />
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={t("paymentHistory")} maxWidth="max-w-2xl">
        {modalError && !payOpen && !paymentToCorrect && (
          <p role="alert" className="mb-3 rounded-lg border border-rose-500/25 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">{modalError}</p>
        )}
        <StatementPaymentHistory
          payments={detail?.paymentHistory ?? []}
          loading={writing}
          onCorrect={(payment) => {
            setModalError(undefined);
            setPaymentToCorrect(payment);
          }}
          onVoid={voidPayment}
        />
      </Modal>
    </div>
  );
}
