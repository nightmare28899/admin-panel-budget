"use client";

import { Select } from "antd";
import Link from "next/link";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CreditCardsSkeleton, ListSkeleton } from "@/components/ui/ContentSkeleton";
import { CreditCardPicker } from "./CreditCardPicker";
import { useCreditCards } from "./hooks/useCreditCards";
import { useFeedbackBanner } from "./hooks/useFeedbackBanner";
import { useStatementImportsList } from "./hooks/useStatementImportsList";
import { useStatementRetry } from "./hooks/useStatementRetry";
import { useStatementUpload } from "./hooks/useStatementUpload";
import { formatStatementPeriod, STATUS_META } from "./statement-import.utils";

export function StatementImportsView() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>();

  const feedback = useFeedbackBanner();
  const creditCards = useCreditCards();
  const imports = useStatementImportsList();

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

  const bannerMessage = feedback.error || imports.error;

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">
            Card statements
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-3)]">
            Upload Banamex PDF statements and review their processing status.
          </p>
        </div>
        <Link
          href="/finance/cards"
          className="text-sm font-medium text-[var(--emerald-text)] hover:underline"
        >
          Manage cards →
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
              aria-label="Dismiss error"
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

      <Card title="Credit card" className="mb-4 !p-5">
        <p className="mb-3 text-xs text-[var(--text-3)]">
          Optional — tag the statement you are about to upload with one of your cards.
        </p>
        {creditCards.loading ? (
          <CreditCardsSkeleton />
        ) : (
          <>
            <CreditCardPicker
              cards={creditCards.cards}
              selectedCardId={selectedCardId}
              onSelect={setSelectedCardId}
              emptyMessage={creditCards.cardsError ? "Cards unavailable" : "No active cards"}
            />
            {creditCards.cardsError && (
              <p className="mt-1.5 text-xs text-[var(--gold-text)]">
                Cards could not be loaded. You can still upload the statement without selecting one.
              </p>
            )}
          </>
        )}
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card title="Upload statement" className="!p-5">
          <div className="space-y-4">
            <div>
              <label htmlFor="statement-file" className="mb-1.5 block text-sm text-[var(--text-2)]">
                Statement PDF
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
                One PDF file, up to 10 MB. The source is deleted after confirmation.
              </p>
            </div>

            {upload.file && (
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-3)]/40 px-3 py-2 text-sm text-[var(--text-2)]">
                <span className="font-medium text-[var(--text-1)]">{upload.file.name}</span>
                <span className="ml-2 text-xs text-[var(--text-3)]">
                  {(upload.file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            )}

            <Button type="button" variant="tinted" loading={upload.uploading} onClick={() => void upload.upload()}>
              Upload and process
            </Button>
          </div>
        </Card>

        <Card title="Review workflow" className="!p-5">
          <ol className="space-y-3 text-sm text-[var(--text-2)]">
            <li><span className="mr-2 text-[var(--emerald-text)]">1.</span>Upload an original Banamex PDF.</li>
            <li><span className="mr-2 text-[var(--emerald-text)]">2.</span>Check warnings and reconciliation.</li>
            <li><span className="mr-2 text-[var(--emerald-text)]">3.</span>Review every candidate before creating expenses.</li>
          </ol>
          <p className="mt-4 text-xs leading-5 text-[var(--text-3)]">
            Uploading does not create expenses. Confirmation remains a separate reviewed action.
          </p>
        </Card>
      </div>

      <Card title="Import history" className="!p-5">
        {creditCards.cards.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <label htmlFor="statement-history-card-filter" className="text-xs text-[var(--text-3)]">
              Filter by card
            </label>
            <Select
              id="statement-history-card-filter"
              allowClear
              value={imports.filterCardId}
              onChange={imports.filterByCard}
              placeholder="All cards"
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
                return (
                  <li key={statementImport.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-[var(--text-1)]">
                          {statementImport.sourceFileName || "Statement PDF"}
                        </p>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {statementImport.warningCount > 0 && (
                          <Badge variant="warning">
                            {statementImport.warningCount} warning{statementImport.warningCount === 1 ? "" : "s"}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-3)]">
                        {formatStatementPeriod(statementImport.periodStart, statementImport.periodEnd)} · Uploaded {dayjs(statementImport.createdAt).format("MMM D, YYYY h:mm A")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {statementImport.status !== "UPLOADED" && (
                        <Button
                          type="button"
                          variant={statementImport.status === "NEEDS_REVIEW" ? "tinted" : "outline"}
                          size="sm"
                          onClick={() => router.push(`/finance/statements/${statementImport.id}`)}
                        >
                          {statementImport.status === "NEEDS_REVIEW" ? "Review" : "View"}
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
                          Retry processing
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
                  Page {imports.history.page} of {imports.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={imports.page <= 1}
                    onClick={() => imports.setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={imports.page >= imports.totalPages}
                    onClick={() => imports.setPage((current) => Math.min(imports.totalPages, current + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-[var(--text-2)]">No statements imported yet.</p>
            <p className="mt-1 text-xs text-[var(--text-3)]">Upload a Banamex PDF to start the review workflow.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
