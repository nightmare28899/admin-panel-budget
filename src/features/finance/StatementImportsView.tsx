"use client";

import { Select } from "antd";
import { CreditCardOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CreditCardsSkeleton, ListSkeleton } from "@/components/ui/ContentSkeleton";
import { CreditCardPicker } from "./CreditCardPicker";
import { creditCardTheme } from "./creditCardVisuals";
import { MarkStatementPaidModal } from "./MarkStatementPaidModal";
import { useCreditCards } from "./hooks/useCreditCards";
import { useFeedbackBanner } from "./hooks/useFeedbackBanner";
import { useStatementDelete } from "./hooks/useStatementDelete";
import { useStatementImportsList } from "./hooks/useStatementImportsList";
import { useStatementRetry } from "./hooks/useStatementRetry";
import { useStatementUpload } from "./hooks/useStatementUpload";
import { STATUS_META } from "./statement-import.utils";
import type { StatementImportStatus } from "./statement-import.types";
import { useLocale } from "@/i18n/LocaleProvider";
import { createStatementPaymentAction, getCreditCardsOverviewAction } from "@/lib/userActions";
import type { CreditCardOverviewResponse } from "./credit-cards.types";
import { StatementDebtSummary } from "./StatementDebtSummary";
import { frontendError } from "@/i18n/errors";
import {
  paymentStatusTone,
  STATEMENT_BACKDROP_CLASS,
  STATEMENT_ERROR_BANNER_CLASS,
  STATEMENT_FIELD_SCOPE,
  STATEMENT_NOTICE_BANNER_CLASS,
  STATEMENT_PICKER_SCOPE,
  StatementBadge,
  StatementButton,
  StatementSectionCard,
  toneFromVariant,
} from "./StatementUi";

export function StatementImportsView() {
  const router = useRouter();
  const { t, formatDate, formatNumber } = useLocale();
  const statusLabels: Record<StatementImportStatus, string> = {
    UPLOADED: t("uploaded"),
    PARSED: t("parsed"),
    NEEDS_REVIEW: t("readyForReview"),
    CONFIRMED: t("confirmed"),
    REVERTED: t("reverted"),
    FAILED: t("processingFailed"),
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>();
  const [pendingPaidId, setPendingPaidId] = useState<string>();
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [overview, setOverview] = useState<CreditCardOverviewResponse>();

  const feedback = useFeedbackBanner();
  const creditCards = useCreditCards();
  const imports = useStatementImportsList();
  const cardsById = new Map(creditCards.cards.map((card) => [card.id, card]));

  useEffect(() => {
    if (feedback.error || feedback.notice) {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [feedback.error, feedback.notice]);

  const upload = useStatementUpload({
    fileInputRef,
    selectedCardId,
    onUploaded: imports.reloadFromStart,
    setError: feedback.setError,
    setNotice: feedback.setNotice,
  });

  const retry = useStatementRetry({
    onRetried: imports.reload,
    setError: feedback.setError,
    setNotice: feedback.setNotice,
  });

  const loadOverview = async () => {
    const result = await getCreditCardsOverviewAction("includeInactive=true");
    if (result.error) feedback.setError(frontendError(result.error, t, "requestFailedGeneric"));
    else setOverview(result.data);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOverview(), 0);
    return () => window.clearTimeout(timer);
    // The overview refreshes explicitly after payment writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteImport = useStatementDelete({
    onDeleted: imports.reload,
    setError: feedback.setError,
    setNotice: feedback.setNotice,
  });

  const bannerMessage = feedback.error || imports.error;
  const pendingPaidStatement = imports.history?.items.find(
    (item) => item.id === pendingPaidId,
  );

  return (
    <div className={`${STATEMENT_BACKDROP_CLASS} max-w-7xl p-4 sm:p-6 ${STATEMENT_FIELD_SCOPE}`}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-white">
             {t("cardStatements")}
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
             {t("statementsDescription")}
          </p>
        </div>
        <Link
          href="/finance/cards"
          className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800/80 focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
           {t("manageCards")}
        </Link>
      </div>

      <div ref={feedbackRef}>
        {bannerMessage && (
          <div
            role="alert"
            className={`mb-4 flex items-start justify-between gap-3 ${STATEMENT_ERROR_BANNER_CLASS}`}
          >
            <span>{bannerMessage}</span>
            <button
              type="button"
              onClick={() => feedback.setError(undefined)}
               aria-label={t("dismissError")}
              className="shrink-0 cursor-pointer text-rose-300/70 transition-colors hover:text-rose-200"
            >
              ✕
            </button>
          </div>
        )}

        {feedback.notice && (
          <div
            role="status"
            className={`mb-4 ${STATEMENT_NOTICE_BANNER_CLASS}`}
          >
            {feedback.notice}
          </div>
        )}
      </div>

       <StatementSectionCard title={t("creditCardRequired")} className="mb-4">
        <p className="mb-3 text-xs text-slate-400">
           {t("cardRequiredTag")}
        </p>
        {creditCards.loading ? (
          <CreditCardsSkeleton />
        ) : (
          <>
            <div className={STATEMENT_PICKER_SCOPE}>
              <CreditCardPicker
                cards={creditCards.cards}
                selectedCardId={selectedCardId}
                onSelect={setSelectedCardId}
                hideEmptyOption
                emptyMessage={creditCards.cardsError ? t("cardsUnavailable") : t("noActiveCards")}
              />
            </div>
            {creditCards.cardsError && (
              <p className="mt-1.5 text-xs text-amber-300">
                 {t("cardsLoadFallback")}
              </p>
            )}
          </>
        )}
      </StatementSectionCard>

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
         <StatementSectionCard title={t("uploadStatement")}>
          <div className="space-y-4">
            <div>
              <label htmlFor="statement-file" className="mb-1.5 block text-sm text-slate-300">
                 {t("statementPdf")}
              </label>
              <input
                ref={fileInputRef}
                id="statement-file"
                type="file"
                accept="application/pdf,.pdf"
                disabled={upload.uploading}
                onChange={(event) => upload.selectFile(event.target.files?.[0])}
                className="peer sr-only"
              />
              <div className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-800 bg-[#0A0F19] p-2 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0D1424]">
                <label
                  htmlFor="statement-file"
                  aria-disabled={upload.uploading}
                  className={`shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 ${
                    upload.uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                  }`}
                >
                  {t("choosePdfFile")}
                </label>
                <span className="min-w-0 truncate text-sm text-slate-300">
                  {upload.file ? upload.file.name : t("noFileSelected")}
                  {upload.file && (
                    <span className="ml-2 font-mono text-xs text-slate-400">
                      {formatNumber(upload.file.size / (1024 * 1024), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MB
                    </span>
                  )}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                 {t("pdfHelp")}
              </p>
            </div>

            <StatementButton
              variant="primary"
              size="md"
              loading={upload.uploading}
              disabled={!selectedCardId}
              onClick={() => void upload.upload()}
            >
               {t("uploadAndProcess")}
            </StatementButton>
          </div>
        </StatementSectionCard>

         <StatementSectionCard title={t("reviewWorkflow")}>
          <ol className="space-y-3 text-sm text-slate-300">
             <li><span className="mr-2 font-mono font-semibold text-emerald-400">1.</span>{t("workflowStep1")}</li>
             <li><span className="mr-2 font-mono font-semibold text-emerald-400">2.</span>{t("workflowStep2")}</li>
             <li><span className="mr-2 font-mono font-semibold text-emerald-400">3.</span>{t("workflowStep3")}</li>
          </ol>
          <p className="mt-4 text-xs leading-5 text-slate-400">
             {t("workflowNotice")}
          </p>
        </StatementSectionCard>
      </div>

       <StatementDebtSummary
         card={overview?.cards.find((card) => card.id === imports.filterCardId)}
         portfolio={imports.filterCardId ? undefined : overview?.portfolio.byCurrency}
       />

       <StatementSectionCard title={t("importHistory")}>
        {creditCards.cards.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <label htmlFor="statement-history-card-filter" className="text-xs text-slate-400">
               {t("filterByCard")}
            </label>
            <Select
              id="statement-history-card-filter"
              allowClear
              value={imports.filterCardId}
              onChange={imports.filterByCard}
               placeholder={t("allCards")}
              className="w-64"
              options={creditCards.cards.map((card) => ({
                value: card.id,
                label: `${card.bank} · ${card.name} •••• ${card.last4}`,
              }))}
            />
          </div>
        )}
        {imports.loading && !imports.history ? (
          <ListSkeleton rows={5} />
        ) : imports.history?.items.length ? (
          <>
            <ul className="divide-y divide-slate-800/60">
              {imports.history.items.map((statementImport) => {
                const status = STATUS_META[statementImport.status];
                const canRetry = statementImport.status === "UPLOADED" || statementImport.status === "FAILED";
                const card = statementImport.creditCardId
                  ? cardsById.get(statementImport.creditCardId)
                  : undefined;
                return (
                  <li key={statementImport.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                         {statementImport.sourceFileName || t("statementPdfFallback")}
                      </p>

                      {card ? (
                        <span
                          className={`mt-1.5 inline-flex max-w-full items-center gap-1.5 truncate rounded-lg border px-2.5 py-1 text-sm font-semibold ${creditCardTheme(card).badgeClass}`}
                        >
                          <CreditCardOutlined className="shrink-0" />
                          <span className="truncate">
                            {card.bank} · {card.name} •••• {card.last4}
                          </span>
                        </span>
                      ) : (
                        <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-400">
                          <CreditCardOutlined className="shrink-0" />
                          {t("noCard")}
                        </span>
                      )}

                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                         <StatementBadge tone={toneFromVariant(status.variant)}>{statusLabels[statementImport.status]}</StatementBadge>
                        {statementImport.warningCount > 0 && (
                          <StatementBadge tone="amber" dot={false}>
                             {t("warningCount", { count: formatNumber(statementImport.warningCount), warnings: t(statementImport.warningCount === 1 ? "warning" : "warnings") })}
                          </StatementBadge>
                        )}
                        <StatementBadge tone={paymentStatusTone(statementImport.paymentStatus)}>
                           {statementImport.paymentStatus === "PAID" ? t("paid") : statementImport.paymentStatus === "PARTIAL" ? t("partial") : t("unpaid")}
                        </StatementBadge>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                         {statementImport.periodStart && statementImport.periodEnd
                           ? `${formatDate(statementImport.periodStart, { dateStyle: "medium" })}–${formatDate(statementImport.periodEnd, { dateStyle: "medium" })}`
                           : "—"} · {t("uploadedAt", { date: formatDate(statementImport.createdAt, { dateStyle: "medium", timeStyle: "short" }) })}
                        {statementImport.isPaid && statementImport.paidAt && (
                           <> · {t("paidAt", { date: formatDate(statementImport.paidAt, { dateStyle: "medium", timeStyle: "short" }) })}</>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {statementImport.status === "CONFIRMED" &&
                        statementImport.paymentSummary.currency !== null &&
                        statementImport.paymentStatus !== "PAID" && (
                        <StatementButton
                          variant="pay"
                          disabled={recordingPayment}
                          onClick={() => setPendingPaidId(statementImport.id)}
                        >
                          {t("recordPayment")}
                        </StatementButton>
                      )}
                      {statementImport.status !== "UPLOADED" && (
                        <StatementButton
                          variant={statementImport.status === "NEEDS_REVIEW" ? "tint" : "secondary"}
                          onClick={() => router.push(`/finance/statements/${statementImport.id}`)}
                        >
                           {statementImport.status === "NEEDS_REVIEW" ? t("review") : t("view")}
                        </StatementButton>
                      )}
                      {canRetry && (
                        <StatementButton
                          variant="secondary"
                          loading={retry.processingId === statementImport.id}
                          disabled={Boolean(retry.processingId) && retry.processingId !== statementImport.id}
                          onClick={() => void retry.retry(statementImport.id)}
                        >
                           {t("retryProcessing")}
                        </StatementButton>
                      )}
                      {statementImport.status !== "CONFIRMED" && (
                        <StatementButton
                          variant="danger"
                          disabled={deleteImport.deleting}
                          onClick={() => deleteImport.requestDelete(statementImport)}
                        >
                           {t("delete")}
                        </StatementButton>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {imports.totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between border-t border-slate-800/60 pt-4 text-sm">
                <span className="text-slate-400">
                   {t("pageOf", { page: formatNumber(imports.history.page), total: formatNumber(imports.totalPages) })}
                </span>
                <div className="flex gap-2">
                  <StatementButton
                    variant="secondary"
                    disabled={imports.page <= 1}
                    onClick={() => imports.setPage((current) => Math.max(1, current - 1))}
                  >
                     {t("previous")}
                  </StatementButton>
                  <StatementButton
                    variant="secondary"
                    disabled={imports.page >= imports.totalPages}
                    onClick={() => imports.setPage((current) => Math.min(imports.totalPages, current + 1))}
                  >
                     {t("next")}
                  </StatementButton>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
             <p className="text-sm font-medium text-slate-300">{t("noStatements")}</p>
             <p className="mt-1 text-xs text-slate-400">{t("noStatementsHelp")}</p>
          </div>
        )}
      </StatementSectionCard>

      <ConfirmModal
        open={Boolean(deleteImport.target)}
        onClose={deleteImport.cancelDelete}
        onConfirm={deleteImport.confirmDelete}
        title={t("deleteStatementImportQuestion")}
        description={t("deleteStatementImportDescription", {
          name: deleteImport.target?.sourceFileName || t("statementPdfFallback"),
        })}
        confirmLabel={t("delete")}
        confirmingLabel={t("deleting")}
        confirmVariant="danger"
        loading={deleteImport.deleting}
      />

      <MarkStatementPaidModal
        open={Boolean(pendingPaidId)}
        onClose={() => setPendingPaidId(undefined)}
        onConfirm={async (value) => {
          if (!pendingPaidId || !pendingPaidStatement) return;
          setRecordingPayment(true);
          const result = await createStatementPaymentAction(pendingPaidId, {
            ...value,
            expectedVersion: pendingPaidStatement.paymentVersion,
            idempotencyKey: crypto.randomUUID(),
          });
          setRecordingPayment(false);
          if (result.error) {
            feedback.setError(frontendError(result.error, t, "paidStatusFailed"));
            return;
          }
          await Promise.all([imports.reload(), loadOverview()]);
          feedback.setNotice(t("paymentRecorded"));
          setPendingPaidId(undefined);
        }}
        defaultAmount={
          pendingPaidStatement?.paymentSummary.currentPaymentDue
        }
        defaultCurrency={pendingPaidStatement?.paymentSummary.currency ?? undefined}
        loading={recordingPayment}
      />
    </div>
  );
}
