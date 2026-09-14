"use client";

import { Select, Switch } from "antd";
import { CreditCardOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CreditCardsSkeleton, ListSkeleton } from "@/components/ui/ContentSkeleton";
import { CreditCardPicker } from "./CreditCardPicker";
import { useCreditCards } from "./hooks/useCreditCards";
import { useFeedbackBanner } from "./hooks/useFeedbackBanner";
import { useStatementDelete } from "./hooks/useStatementDelete";
import { useStatementImportsList } from "./hooks/useStatementImportsList";
import { useStatementPaidToggle } from "./hooks/useStatementPaidToggle";
import { useStatementRetry } from "./hooks/useStatementRetry";
import { useStatementUpload } from "./hooks/useStatementUpload";
import { STATUS_META } from "./statement-import.utils";
import type { StatementImportStatus } from "./statement-import.types";
import { useLocale } from "@/i18n/LocaleProvider";

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

  const paidToggle = useStatementPaidToggle({
    onToggled: imports.reload,
    setError: feedback.setError,
    setNotice: feedback.setNotice,
  });

  const deleteImport = useStatementDelete({
    onDeleted: imports.reload,
    setError: feedback.setError,
    setNotice: feedback.setNotice,
  });

  const bannerMessage = feedback.error || imports.error;

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">
             {t("cardStatements")}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-3)]">
             {t("statementsDescription")}
          </p>
        </div>
        <Link
          href="/finance/cards"
          className="text-sm font-medium text-[var(--emerald-text)] hover:underline"
        >
           {t("manageCards")}
        </Link>
      </div>

      <div ref={feedbackRef}>
        {bannerMessage && (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]"
          >
            <span>{bannerMessage}</span>
            <button
              type="button"
              onClick={() => feedback.setError(undefined)}
               aria-label={t("dismissError")}
              className="shrink-0 cursor-pointer text-[var(--rose)]/70 transition-colors hover:text-[var(--rose)]"
            >
              ✕
            </button>
          </div>
        )}

        {feedback.notice && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-[var(--emerald)]/40 bg-[var(--emerald-dim)] px-4 py-3 text-sm text-[var(--emerald-text)]"
          >
            {feedback.notice}
          </div>
        )}
      </div>

       <Card title={t("creditCardRequired")} className="mb-4 !p-5">
        <p className="mb-3 text-xs text-[var(--text-3)]">
           {t("cardRequiredTag")}
        </p>
        {creditCards.loading ? (
          <CreditCardsSkeleton />
        ) : (
          <>
            <CreditCardPicker
              cards={creditCards.cards}
              selectedCardId={selectedCardId}
              onSelect={setSelectedCardId}
              hideEmptyOption
               emptyMessage={creditCards.cardsError ? t("cardsUnavailable") : t("noActiveCards")}
            />
            {creditCards.cardsError && (
              <p className="mt-1.5 text-xs text-[var(--gold-text)]">
                 {t("cardsLoadFallback")}
              </p>
            )}
          </>
        )}
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
         <Card title={t("uploadStatement")} className="!p-5">
          <div className="space-y-4">
            <div>
              <label htmlFor="statement-file" className="mb-1.5 block text-sm text-[var(--text-2)]">
                 {t("statementPdf")}
              </label>
              <input
                ref={fileInputRef}
                id="statement-file"
                type="file"
                accept="application/pdf,.pdf"
                disabled={upload.uploading}
                onChange={(event) => upload.selectFile(event.target.files?.[0])}
                className="block w-full cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg-3)]/60 px-3 py-2 text-sm text-[var(--text-2)] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--emerald-dim)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[var(--emerald-text)] disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1.5 text-xs text-[var(--text-3)]">
                 {t("pdfHelp")}
              </p>
            </div>

            {upload.file && (
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-3)]/40 px-3 py-2 text-sm text-[var(--text-2)]">
                <span className="font-medium text-[var(--text-1)]">{upload.file.name}</span>
                <span className="ml-2 text-xs text-[var(--text-3)]">
                   {formatNumber(upload.file.size / (1024 * 1024), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MB
                </span>
              </div>
            )}

            <Button
              type="button"
              variant="tinted"
              loading={upload.uploading}
              disabled={!selectedCardId}
              onClick={() => void upload.upload()}
            >
               {t("uploadAndProcess")}
            </Button>
          </div>
        </Card>

         <Card title={t("reviewWorkflow")} className="!p-5">
          <ol className="space-y-3 text-sm text-[var(--text-2)]">
             <li><span className="mr-2 text-[var(--emerald-text)]">1.</span>{t("workflowStep1")}</li>
             <li><span className="mr-2 text-[var(--emerald-text)]">2.</span>{t("workflowStep2")}</li>
             <li><span className="mr-2 text-[var(--emerald-text)]">3.</span>{t("workflowStep3")}</li>
          </ol>
          <p className="mt-4 text-xs leading-5 text-[var(--text-3)]">
             {t("workflowNotice")}
          </p>
        </Card>
      </div>

       <Card title={t("importHistory")} className="!p-5">
        {creditCards.cards.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <label htmlFor="statement-history-card-filter" className="text-xs text-[var(--text-3)]">
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
            <ul className="divide-y divide-[var(--border-soft)]">
              {imports.history.items.map((statementImport) => {
                const status = STATUS_META[statementImport.status];
                const canRetry = statementImport.status === "UPLOADED" || statementImport.status === "FAILED";
                const card = statementImport.creditCardId
                  ? cardsById.get(statementImport.creditCardId)
                  : undefined;
                return (
                  <li key={statementImport.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-1)]">
                         {statementImport.sourceFileName || t("statementPdfFallback")}
                      </p>

                      {card ? (
                        <span
                          className="mt-1.5 inline-flex max-w-full items-center gap-1.5 truncate rounded-lg px-2.5 py-1 text-sm font-semibold"
                          style={{
                            background: `${card.color ?? "var(--emerald)"}1F`,
                            color: card.color ?? "var(--emerald-text)",
                          }}
                        >
                          <CreditCardOutlined className="shrink-0" />
                          <span className="truncate">
                            {card.bank} · {card.name} •••• {card.last4}
                          </span>
                        </span>
                      ) : (
                        <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[var(--text-3)]">
                          <CreditCardOutlined className="shrink-0" />
                          {t("noCard")}
                        </span>
                      )}

                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                         <Badge variant={status.variant}>{statusLabels[statementImport.status]}</Badge>
                        {statementImport.warningCount > 0 && (
                          <Badge variant="warning">
                             {t("warningCount", { count: formatNumber(statementImport.warningCount), warnings: t(statementImport.warningCount === 1 ? "warning" : "warnings") })}
                          </Badge>
                        )}
                        <Badge variant={statementImport.isPaid ? "success" : "neutral"}>
                           {statementImport.isPaid ? t("paid") : t("unpaid")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-3)]">
                         {statementImport.periodStart && statementImport.periodEnd
                           ? `${formatDate(statementImport.periodStart, { dateStyle: "medium" })}–${formatDate(statementImport.periodEnd, { dateStyle: "medium" })}`
                           : "—"} · {t("uploadedAt", { date: formatDate(statementImport.createdAt, { dateStyle: "medium", timeStyle: "short" }) })}
                        {statementImport.isPaid && statementImport.paidAt && (
                           <> · {t("paidAt", { date: formatDate(statementImport.paidAt, { dateStyle: "medium", timeStyle: "short" }) })}</>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-[var(--text-3)]">
                         {t("paid")}
                        <Switch
                          size="small"
                          checked={statementImport.isPaid}
                          loading={paidToggle.togglingId === statementImport.id}
                          disabled={Boolean(paidToggle.togglingId) && paidToggle.togglingId !== statementImport.id}
                           aria-label={t("markStatementPaidState", { name: statementImport.sourceFileName || t("statements"), state: statementImport.isPaid ? t("unpaid").toLowerCase() : t("paid").toLowerCase() })}
                          onChange={(checked) => void paidToggle.toggle(statementImport.id, checked)}
                        />
                      </label>
                      {statementImport.status !== "UPLOADED" && (
                        <Button
                          type="button"
                          variant={statementImport.status === "NEEDS_REVIEW" ? "tinted" : "outline"}
                          size="sm"
                          onClick={() => router.push(`/finance/statements/${statementImport.id}`)}
                        >
                           {statementImport.status === "NEEDS_REVIEW" ? t("review") : t("view")}
                        </Button>
                      )}
                      {canRetry && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={retry.processingId === statementImport.id}
                          disabled={Boolean(retry.processingId) && retry.processingId !== statementImport.id}
                          onClick={() => void retry.retry(statementImport.id)}
                        >
                           {t("retryProcessing")}
                        </Button>
                      )}
                      {statementImport.status !== "CONFIRMED" && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={deleteImport.deleting}
                          onClick={() => deleteImport.requestDelete(statementImport)}
                        >
                           {t("delete")}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {imports.totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between border-t border-[var(--border-soft)] pt-4 text-sm">
                <span className="text-[var(--text-3)]">
                   {t("pageOf", { page: formatNumber(imports.history.page), total: formatNumber(imports.totalPages) })}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={imports.page <= 1}
                    onClick={() => imports.setPage((current) => Math.max(1, current - 1))}
                  >
                     {t("previous")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={imports.page >= imports.totalPages}
                    onClick={() => imports.setPage((current) => Math.min(imports.totalPages, current + 1))}
                  >
                     {t("next")}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
             <p className="text-sm font-medium text-[var(--text-2)]">{t("noStatements")}</p>
             <p className="mt-1 text-xs text-[var(--text-3)]">{t("noStatementsHelp")}</p>
          </div>
        )}
      </Card>

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
    </div>
  );
}
