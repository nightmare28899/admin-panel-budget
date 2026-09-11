"use client";

import { Select } from "antd";
import Link from "next/link";
import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CreditCardsSkeleton, ListSkeleton } from "@/components/ui/ContentSkeleton";
import { CreditCardPicker } from "./CreditCardPicker";
import {
  createStatementImportAction,
  getCreditCardsAction,
  getStatementImportsAction,
  processStatementImportAction,
} from "@/lib/userActions";
import type {
  CreditCardSummary,
  StatementImportListResponse,
  StatementImportStatus,
} from "./statement-import.types";

const MAX_STATEMENT_FILE_SIZE = 10 * 1024 * 1024;
const PAGE_SIZE = 20;

const STATUS_META: Record<
  StatementImportStatus,
  { label: string; variant: BadgeVariant }
> = {
  UPLOADED: { label: "Uploaded", variant: "info" },
  PARSED: { label: "Parsed", variant: "info" },
  NEEDS_REVIEW: { label: "Ready for review", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  REVERTED: { label: "Reverted", variant: "neutral" },
  FAILED: { label: "Processing failed", variant: "danger" },
};

function formatPeriod(start?: string | null, end?: string | null) {
  if (!start || !end) return "Period pending";
  return `${dayjs(start).format("MMM D, YYYY")} – ${dayjs(end).format("MMM D, YYYY")}`;
}

function validateStatementFile(file: File): string | undefined {
  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  if (file.type !== "application/pdf" && !hasPdfExtension) {
    return "Choose a PDF statement.";
  }
  if (file.size > MAX_STATEMENT_FILE_SIZE) {
    return "The PDF must be 10 MB or smaller.";
  }
  return undefined;
}

export function StatementImportsView() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<StatementImportListResponse>();
  const [cards, setCards] = useState<CreditCardSummary[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>();
  const [filterCardId, setFilterCardId] = useState<string>();
  const [file, setFile] = useState<File>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string>();
  const [error, setError] = useState<string>();
  const [cardsError, setCardsError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);

    const query = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (filterCardId) query.set("creditCardId", filterCardId);
    const [importsResult, cardsResult] = await Promise.all([
      getStatementImportsAction(query.toString()),
      getCreditCardsAction(),
    ]);

    if (importsResult.sessionExpired || cardsResult.sessionExpired) {
      router.push("/user-login");
      return;
    }

    if (importsResult.error) setError(importsResult.error);
    else setHistory(importsResult.data);

    if (cardsResult.error) {
      setCards([]);
      setCardsError(cardsResult.error);
    } else {
      setCards(cardsResult.data ?? []);
      setCardsError(undefined);
    }

    setLoading(false);
  }, [page, filterCardId, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // The action that sets error/notice (Retry processing, Upload) usually
  // happens further down a long page than this banner renders — without
  // this, the result of a click is invisible unless you already happen to
  // be scrolled to the top.
  useEffect(() => {
    if (error || notice) {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error, notice]);

  const selectFile = (nextFile?: File) => {
    setNotice(undefined);
    setError(undefined);
    if (!nextFile) {
      setFile(undefined);
      return;
    }

    const validationError = validateStatementFile(nextFile);
    if (validationError) {
      setFile(undefined);
      setError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(nextFile);
  };

  const upload = async () => {
    if (!file) {
      setError("Choose a PDF statement before uploading.");
      return;
    }

    setUploading(true);
    setError(undefined);
    setNotice(undefined);
    const result = await createStatementImportAction(file, selectedCardId);
    setUploading(false);

    if (result.sessionExpired) {
      router.push("/user-login");
      return;
    }
    if (result.error || !result.data) {
      setError(result.error ?? "The statement could not be uploaded.");
      return;
    }

    const imported = result.data;
    const processingError =
      imported.status === "FAILED"
        ? (imported.failureMessage || imported.failureCode
            ? `The PDF was stored, but processing failed: ${imported.failureMessage || imported.failureCode}`
            : "The PDF was stored, but processing failed.")
        : undefined;

    if (!processingError && imported.duplicate) {
      setNotice("This PDF was already uploaded. Its existing import is shown below.");
    } else if (imported.status === "NEEDS_REVIEW") {
      setNotice("Statement processed successfully and is ready for review.");
    } else if (!processingError) {
      setNotice("Statement uploaded successfully.");
    }

    setFile(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (page === 1) await load();
    else setPage(1);
    if (processingError) setError(processingError);
  };

  const retry = async (id: string) => {
    setProcessingId(id);
    setError(undefined);
    setNotice(undefined);
    const result = await processStatementImportAction(id);
    setProcessingId(undefined);

    if (result.sessionExpired) {
      router.push("/user-login");
      return;
    }
    if (result.error || !result.data) {
      setError(result.error ?? "The statement could not be processed.");
      return;
    }

    await load();
    if (result.data.status === "FAILED") {
      setError(
        result.data.failureMessage ||
          result.data.failureCode ||
          "The statement could not be processed.",
      );
    } else {
      setNotice(
        result.data.status === "NEEDS_REVIEW"
          ? "Statement processed successfully and is ready for review."
          : "Statement processing completed.",
      );
    }
  };

  const filterByCard = (cardId: string | undefined) => {
    setFilterCardId(cardId);
    setPage(1);
  };

  const totalPages = Math.max(1, history?.totalPages ?? 1);

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
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(undefined)}
            aria-label="Dismiss error"
            className="shrink-0 cursor-pointer text-[var(--rose)]/70 transition-colors hover:text-[var(--rose)]"
          >
            ✕
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-[var(--emerald)]/40 bg-[var(--emerald-dim)] px-4 py-3 text-sm text-[var(--emerald-text)]"
        >
          {notice}
        </div>
      )}
      </div>

      <Card title="Credit card" className="mb-4 !p-5">
        <p className="mb-3 text-xs text-[var(--text-3)]">
          Optional — tag the statement you are about to upload with one of your cards.
        </p>
        {loading && !history ? (
          <CreditCardsSkeleton />
        ) : (
          <>
            <CreditCardPicker
              cards={cards}
              selectedCardId={selectedCardId}
              onSelect={setSelectedCardId}
              emptyMessage={cardsError ? "Cards unavailable" : "No active cards"}
            />
            {cardsError && (
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
                disabled={uploading}
                onChange={(event) => selectFile(event.target.files?.[0])}
                className="block w-full cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg-3)]/60 px-3 py-2 text-sm text-[var(--text-2)] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--emerald-dim)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[var(--emerald-text)] disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1.5 text-xs text-[var(--text-3)]">
                One PDF file, up to 10 MB. The source is deleted after confirmation.
              </p>
            </div>

            {file && (
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-3)]/40 px-3 py-2 text-sm text-[var(--text-2)]">
                <span className="font-medium text-[var(--text-1)]">{file.name}</span>
                <span className="ml-2 text-xs text-[var(--text-3)]">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            )}

            <Button type="button" variant="tinted" loading={uploading} onClick={() => void upload()}>
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
        {cards.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <label htmlFor="statement-history-card-filter" className="text-xs text-[var(--text-3)]">
              Filter by card
            </label>
            <Select
              id="statement-history-card-filter"
              allowClear
              value={filterCardId}
              onChange={filterByCard}
              placeholder="All cards"
              className="w-64"
              options={cards.map((card) => ({
                value: card.id,
                label: `${card.bank} · ${card.name} •••• ${card.last4}`,
              }))}
            />
          </div>
        )}
        {loading && !history ? (
          <ListSkeleton rows={5} />
        ) : history?.items.length ? (
          <>
            <ul className="divide-y divide-[var(--border-soft)]">
              {history.items.map((statementImport) => {
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
                        {formatPeriod(statementImport.periodStart, statementImport.periodEnd)} · Uploaded {dayjs(statementImport.createdAt).format("MMM D, YYYY h:mm A")}
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
                          loading={processingId === statementImport.id}
                          disabled={Boolean(processingId) && processingId !== statementImport.id}
                          onClick={() => void retry(statementImport.id)}
                        >
                          Retry processing
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {history.totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between border-t border-[var(--border-soft)] pt-4 text-sm">
                <span className="text-[var(--text-3)]">
                  Page {history.page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                    Previous
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
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
