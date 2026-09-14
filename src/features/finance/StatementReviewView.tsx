"use client";

import { Input, InputNumber, Select, Switch, Table, type TableColumnsType, type TableProps } from "antd";
import { cloneElement, useCallback, useEffect, useMemo, useState, type AriaAttributes, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TableSkeleton } from "@/components/ui/ContentSkeleton";
import {
  confirmStatementImportAction,
  getCategoriesAction,
  getCreditCardsAction,
  getStatementImportAction,
  markStatementImportPaidAction,
  revertStatementImportAction,
  updateStatementRowsAction,
} from "@/lib/userActions";
import { toCalendarDate, type Category } from "./finance.types";
import type {
  CreditCardSummary,
  StatementImportDetail,
  StatementImportStatus,
  StatementReconciliationStatus,
  StatementRow,
  StatementRowDecision,
  StatementRowKind,
  StatementSection,
  UpdateStatementRowPayload,
} from "./statement-import.types";
import { STATUS_META } from "./statement-import.utils";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";
import type { MessageKey } from "@/i18n/messages";

const ROW_KIND_KEYS: Record<StatementRowKind, MessageKey> = {
  CHARGE: "statementRowKindCharge",
  PAYMENT: "statementRowKindPayment",
  CREDIT: "statementRowKindCredit",
  INTEREST: "statementRowKindInterest",
  TAX: "statementRowKindTax",
  REFINANCED_PRINCIPAL: "statementRowKindRefinancedPrincipal",
  CFDI: "statementRowKindCfdi",
  UNKNOWN: "unknown",
};

const SECTION_KEYS: Record<StatementSection, MessageKey> = {
  CURRENT_CHARGES: "statementSectionCurrentCharges",
  FINANCING_PLAN: "statementSectionFinancingPlan",
  CFDI: "statementSectionCfdi",
  RECONCILIATION: "reconciliation",
  PAYMENT_TARGET: "statementSectionPaymentTarget",
  OTHER: "statementSectionOther",
};

const WARNING_CODE_KEYS: Record<string, MessageKey> = {
  FISCAL_APPENDIX_NOT_TRANSACTION: "statementWarningFiscalAppendix",
  DEBT_AMORTIZATION_NOT_EXPENSE: "statementWarningDebtAmortization",
  REPEATED_LOOKING_OCCURRENCE: "statementWarningRepeatedOccurrence",
};

const RECONCILIATION_STATUS_KEYS: Record<StatementReconciliationStatus, MessageKey> = {
  PENDING: "pending",
  PASSED: "statementReconciliationPassed",
  FAILED: "statementReconciliationFailed",
};

const EXPENSE_KINDS = new Set(["CHARGE", "INTEREST", "TAX"]);
function canIncludeAsExpense(row: StatementRow) {
  return row.section !== "CFDI" && EXPENSE_KINDS.has(row.kind);
}

function isSameTransactionText(description: string, merchantName: string | null | undefined) {
  const normalizedMerchant = merchantName?.trim();
  return Boolean(
    normalizedMerchant && normalizedMerchant.toLocaleLowerCase() === description.trim().toLocaleLowerCase(),
  );
}

function isIncludedRowValid(row: StatementRow, hasDefaultCard: boolean) {
  return (
    canIncludeAsExpense(row) &&
    Boolean(row.transactionDate) &&
    Boolean(row.categoryId) &&
    (Boolean(row.linkedCreditCardId) || hasDefaultCard) &&
    Number.isFinite(Number(row.amount)) &&
    Number(row.amount) > 0 &&
    /^[A-Z]{3}$/.test(row.currency)
  );
}

// Inline style beats antd's own row/cell CSS without fighting specificity,
// so a row's review state (needs a decision, ready to confirm, missing
// required data) reads at a glance across a table of dozens of rows.
function rowTint(row: StatementRow, hasDefaultCard: boolean): string | undefined {
  if (row.decision === "INCLUDE_EXPENSE") {
    return isIncludedRowValid(row, hasDefaultCard)
      ? "color-mix(in oklch, var(--emerald) 7%, transparent)"
      : "color-mix(in oklch, var(--rose) 9%, transparent)";
  }
  if (row.decision === "PENDING") {
    return "color-mix(in oklch, var(--gold) 7%, transparent)";
  }
  return undefined;
}

export function StatementReviewView({
  statementImportId,
}: {
  statementImportId: string;
}) {
  const router = useRouter();
  const { t, formatDate, formatNumber } = useLocale();
  const formatMoney = (value: number | string, currency: string) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? `$${formatNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}` : `$— ${currency}`;
  };
  const decisionOptions: Array<{ value: StatementRowDecision; label: string }> = [
    { value: "PENDING", label: t("pending") },
    { value: "INCLUDE_EXPENSE", label: t("includeExpense") },
    { value: "EXCLUDE", label: t("exclude") },
    { value: "INFO_ONLY", label: t("informationOnly") },
  ];
  const statusLabels: Record<StatementImportStatus, string> = {
    UPLOADED: t("uploaded"), PARSED: t("parsed"), NEEDS_REVIEW: t("readyForReview"),
    CONFIRMED: t("confirmed"), REVERTED: t("reverted"), FAILED: t("processingFailed"),
  };
  const rowKindLabel = (kind: string) =>
    kind in ROW_KIND_KEYS ? t(ROW_KIND_KEYS[kind as StatementRowKind]) : kind.replaceAll("_", " ");
  const sectionLabel = (section: string) =>
    section in SECTION_KEYS ? t(SECTION_KEYS[section as StatementSection]) : section.replaceAll("_", " ");
  const warningLabel = (code: string) =>
    code in WARNING_CODE_KEYS ? t(WARNING_CODE_KEYS[code]) : code.replaceAll("_", " ");
  const reconciliationStatusLabel = (status: string) =>
    status in RECONCILIATION_STATUS_KEYS
      ? t(RECONCILIATION_STATUS_KEYS[status as StatementReconciliationStatus])
      : status.replaceAll("_", " ");
  const [statementImport, setStatementImport] = useState<StatementImportDetail>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCardSummary[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UpdateStatementRowPayload>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [togglingPaid, setTogglingPaid] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [cardsError, setCardsError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [revealedMerchantIds, setRevealedMerchantIds] = useState<Set<string>>(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    setNotice(undefined);
    setSelectedRowIds([]);
    setRevealedMerchantIds(new Set());

    const [detailResult, categoriesResult, cardsResult] = await Promise.all([
      getStatementImportAction(statementImportId),
      getCategoriesAction(),
      getCreditCardsAction(),
    ]);

    if (
      detailResult.sessionExpired ||
      categoriesResult.sessionExpired ||
      cardsResult.sessionExpired
    ) {
      router.push("/user-login");
      return;
    }

    if (detailResult.error || !detailResult.data) {
      setError(frontendError(detailResult.error, t, "statementLoadFailed"));
      setLoading(false);
      return;
    }

    setStatementImport(detailResult.data);
    setDrafts({});

    if (categoriesResult.error) setError(frontendError(categoriesResult.error, t, "requestFailedGeneric"));
    else setCategories(categoriesResult.data ?? []);

    if (cardsResult.error) {
      setCards([]);
      setCardsError(frontendError(cardsResult.error, t, "requestFailedGeneric"));
    } else {
      setCards(cardsResult.data ?? []);
      setCardsError(undefined);
    }
    setLoading(false);
  }, [router, statementImportId, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const patchRow = (id: string, patch: Omit<UpdateStatementRowPayload, "id">) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch, id },
    }));
    setNotice(undefined);
  };

  const rows = useMemo(
    () =>
      (statementImport?.rows ?? []).map((row) => ({
        ...row,
        ...drafts[row.id],
      })),
    [drafts, statementImport?.rows],
  );

  const editable = statementImport?.status === "NEEDS_REVIEW";
  const selectedRowIdSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);
  const selectedRows = rows.filter((row) => selectedRowIdSet.has(row.id));
  const changedRows = Object.values(drafts);
  const includedRows = rows.filter((row) => row.decision === "INCLUDE_EXPENSE");
  const pendingCount = rows.filter((row) => row.decision === "PENDING").length;
  const hasDefaultCard = Boolean(statementImport?.creditCardId);
  const invalidIncludedRows = includedRows.filter((row) => !isIncludedRowValid(row, hasDefaultCard));
  const reconciliationPassed = statementImport?.reconciliation?.status === "PASSED";
  const canConfirm = Boolean(
    editable &&
      reconciliationPassed &&
      pendingCount === 0 &&
      includedRows.length > 0 &&
      invalidIncludedRows.length === 0 &&
      changedRows.length === 0,
  );

  const blockers = [
    !reconciliationPassed ? t("reconciliationMustPass") : undefined,
    pendingCount > 0 ? t("rowsStillPending", { count: formatNumber(pendingCount), rows: t(pendingCount === 1 ? "rowIs" : "rowsAre") }) : undefined,
    includedRows.length === 0 ? t("atLeastOneExpense") : undefined,
    invalidIncludedRows.length > 0
      ? t("rowsMissingData", { count: formatNumber(invalidIncludedRows.length), rows: t(invalidIncludedRows.length === 1 ? "rowIs" : "rowsAre") })
      : undefined,
    changedRows.length > 0 ? t("saveBeforeConfirmation") : undefined,
  ].filter((value): value is string => Boolean(value));

  const saveRows = async () => {
    if (!statementImport || changedRows.length === 0) return;
    if (changedRows.length > 200) {
      setError(t("saveMaxRows"));
      return;
    }
    if (invalidIncludedRows.length > 0) {
      setError(t("includedExpenseRequirements"));
      return;
    }

    setSaving(true);
    setError(undefined);
    const result = await updateStatementRowsAction(statementImport.id, {
      version: statementImport.version,
      rows: changedRows,
    });
    setSaving(false);

    if (result.sessionExpired) {
      router.push("/user-login");
      return;
    }
    if (result.error || !result.data) {
      setError(frontendError(result.error, t, "reviewedRowsSaveFailed"));
      return;
    }

    setStatementImport(result.data);
    setDrafts({});
    setSelectedRowIds([]);
    setNotice(t("reviewSaved"));
  };

  const confirmImport = async () => {
    if (!statementImport || !canConfirm) return;
    setConfirming(true);
    setError(undefined);
    const result = await confirmStatementImportAction(statementImport.id, {
      version: statementImport.version,
    });
    setConfirming(false);
    setConfirmOpen(false);

    if (result.sessionExpired) {
      router.push("/user-login");
      return;
    }
    if (result.error || !result.data) {
      setError(frontendError(result.error, t, "confirmImportFailed"));
      return;
    }

    setStatementImport(result.data.import);
    setSelectedRowIds([]);
    setRevealedMerchantIds(new Set());
    setNotice(t("expensesCreated", { count: formatNumber(result.data.createdExpenseCount), expenses: t(result.data.createdExpenseCount === 1 ? "expenseWord" : "expensesWord") }));
  };

  const revertImport = async () => {
    if (!statementImport || statementImport.status !== "CONFIRMED") return;
    setReverting(true);
    setError(undefined);
    const result = await revertStatementImportAction(statementImport.id, {
      version: statementImport.version,
    });
    setReverting(false);
    setRevertOpen(false);

    if (result.sessionExpired) {
      router.push("/user-login");
      return;
    }
    if (result.error || !result.data) {
      setError(frontendError(result.error, t, "revertImportFailed"));
      return;
    }

    setStatementImport(result.data.import);
    setSelectedRowIds([]);
    setRevealedMerchantIds(new Set());
    setNotice(t("expensesRemoved", { count: formatNumber(result.data.deletedExpenseCount), expenses: t(result.data.deletedExpenseCount === 1 ? "expenseWord" : "expensesWord") }));
  };

  const togglePaid = async (isPaid: boolean) => {
    if (!statementImport) return;
    setTogglingPaid(true);
    setError(undefined);
    const result = await markStatementImportPaidAction(statementImport.id, isPaid);
    setTogglingPaid(false);

    if (result.sessionExpired) {
      router.push("/user-login");
      return;
    }
    if (result.error || !result.data) {
      setError(frontendError(result.error, t, "paidStatusFailed"));
      return;
    }

    const returnedRowIds = new Set(result.data.rows.map((row) => row.id));
    setSelectedRowIds((current) => current.filter((id) => returnedRowIds.has(id)));
    setStatementImport(result.data);
    setNotice(isPaid ? t("markedPaid") : t("markedUnpaid"));
  };

  const applyBulkDecision = (decision: StatementRowDecision) => {
    if (!editable || selectedRows.length === 0) return;

    if (decision === "INCLUDE_EXPENSE") {
      const includableRows = selectedRows.filter(canIncludeAsExpense);
      includableRows.forEach((row) => patchRow(row.id, { decision }));
      const skippedCount = selectedRows.length - includableRows.length;
      if (skippedCount > 0) {
        setNotice(t("bulkIncludeSkipped", { count: formatNumber(skippedCount) }));
      }
      return;
    }

    selectedRows.forEach((row) => patchRow(row.id, { decision }));
  };

  const rowSelection: TableProps<StatementRow>["rowSelection"] = editable
    ? {
        selectedRowKeys: selectedRowIds,
        onChange: (selectedKeys) => setSelectedRowIds(selectedKeys.map(String)),
        renderCell: (_checked, row, _index, originNode) =>
          cloneElement(originNode as ReactElement<AriaAttributes>, {
            "aria-label": t("selectStatementRow", { description: row.description }),
          }),
        getTitleCheckboxProps: () => ({
          "aria-label": t("selectAllStatementRows"),
        }),
        columnWidth: 48,
      }
    : undefined;

  const columns: TableColumnsType<StatementRow> = [
    {
      title: t("transaction"),
      width: 340,
      render: (_, row) => {
        const merchantMatchesDescription = isSameTransactionText(row.description, row.merchantName);
        const normalizedMerchant = row.merchantName?.trim();
        const showMerchantInput = revealedMerchantIds.has(row.id);
        const dateId = `statement-row-${row.id}-date`;
        const descriptionId = `statement-row-${row.id}-description`;
        const merchantId = `statement-row-${row.id}-merchant`;
        const merchantRegionId = `${merchantId}-region`;

        return (
          <div className="space-y-3">
            <div>
              <label htmlFor={dateId} className="mb-1 block text-xs font-medium text-[var(--text-3)]">{t("transactionDate")}</label>
              <Input
                id={dateId}
                type="date"
                value={toCalendarDate(row.transactionDate)}
                disabled={!editable}
                aria-label={t("transactionDateFor", { description: row.description })}
                onChange={(event) => {
                  if (event.target.value) {
                    patchRow(row.id, { transactionDate: `${event.target.value}T12:00:00.000Z` });
                  }
                }}
              />
            </div>
            <div>
              <label htmlFor={descriptionId} className="mb-1 block text-xs font-medium text-[var(--text-3)]">{t("statementDescription")}</label>
              <Input
                id={descriptionId}
                value={row.description}
                disabled
                maxLength={240}
                aria-label={t("descriptionForRow", { row: row.position + 1 })}
              />
            </div>
            <div>
              {showMerchantInput ? (
                <label htmlFor={merchantId} className="mb-1 block text-xs font-medium text-[var(--text-3)]">{t("normalizedMerchant")}</label>
              ) : (
                <span className="mb-1 block text-xs font-medium text-[var(--text-3)]">{t("normalizedMerchant")}</span>
              )}
              <div
                className={showMerchantInput
                  ? "flex items-center gap-2"
                  : "flex min-h-8 items-center justify-between gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-3)]/40 px-3 py-1.5"}
              >
                <div id={merchantRegionId} className="min-w-0 flex-1">
                  {showMerchantInput ? (
                    <Input
                      id={merchantId}
                      value={row.merchantName ?? ""}
                      disabled={!editable}
                      maxLength={120}
                      placeholder={t("merchant")}
                      aria-label={t("merchantForRow", { row: row.position + 1 })}
                      onChange={(event) => patchRow(row.id, { merchantName: event.target.value || null })}
                    />
                  ) : (
                    <span className="text-xs text-[var(--text-3)]">
                      {merchantMatchesDescription
                        ? t("sameAsDescription")
                        : normalizedMerchant
                          ? t("normalizedMerchantSummary", { merchant: normalizedMerchant })
                          : t("noNormalizedMerchant")}
                    </span>
                  )}
                </div>
                {editable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 !h-7 !px-2"
                    aria-label={showMerchantInput
                      ? t("hideMerchantForRow", { row: row.position + 1 })
                      : t("editMerchantForRow", { row: row.position + 1 })}
                    aria-expanded={showMerchantInput}
                    aria-controls={merchantRegionId}
                    onClick={() => setRevealedMerchantIds((current) => {
                      const next = new Set(current);
                      if (next.has(row.id)) next.delete(row.id);
                      else next.add(row.id);
                      return next;
                    })}
                  >
                    {showMerchantInput ? t("hideMerchant") : t("editMerchant")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: t("type"),
      width: 155,
      render: (_, row) => (
        <div className="space-y-2">
          <Badge variant={canIncludeAsExpense(row) ? "info" : "neutral"}>
            {rowKindLabel(row.kind)}
          </Badge>
          <p className="text-xs text-[var(--text-3)]">{sectionLabel(row.section)}</p>
          {row.warningCodes?.map((warning) => (
            <p key={warning} className="text-xs text-[var(--gold-text)]">{warningLabel(warning)}</p>
          ))}
        </div>
      ),
    },
    {
      title: t("amount"),
      width: 175,
      render: (_, row) => (
        <div className="flex gap-2">
          <InputNumber
            value={Number(row.amount)}
            prefix="$"
            min={0.01}
            precision={2}
            disabled={!editable}
            aria-label={t("amountFor", { description: row.description })}
            className="min-w-0 flex-1"
            onChange={(value) => {
              if (typeof value === "number") patchRow(row.id, { amount: value });
            }}
          />
          <Input
            value={row.currency}
            maxLength={3}
            disabled={!editable}
            aria-label={t("currencyFor", { description: row.description })}
            className="!w-16 uppercase"
            onChange={(event) => patchRow(row.id, { currency: event.target.value.toUpperCase() })}
          />
        </div>
      ),
    },
    {
      title: t("category"),
      width: 190,
      render: (_, row) => (
        <Select
          allowClear
          value={row.categoryId ?? undefined}
          disabled={!editable || row.decision !== "INCLUDE_EXPENSE"}
          placeholder={t("selectCategory")}
          aria-label={t("categoryFor", { description: row.description })}
          className="w-full"
          options={categories.map((category) => ({
            value: category.id,
            label: `${category.icon ?? ""} ${category.name}`.trim(),
          }))}
          onChange={(value) => patchRow(row.id, { categoryId: value ?? null })}
        />
      ),
    },
    {
      title: t("creditCard"),
      width: 220,
      render: (_, row) => (
        <Select
          allowClear
          value={row.linkedCreditCardId ?? undefined}
          disabled={!editable || row.decision !== "INCLUDE_EXPENSE"}
          placeholder={statementImport?.creditCard ? t("useCard", { name: statementImport.creditCard.name }) : t("selectCard")}
          aria-label={t("creditCardFor", { description: row.description })}
          className="w-full"
          options={cards.map((card) => ({
            value: card.id,
            label: `${card.bank} · ${card.name} •••• ${card.last4}`,
          }))}
          onChange={(value) => patchRow(row.id, { linkedCreditCardId: value ?? null })}
        />
      ),
    },
    {
      title: t("decision"),
      width: 190,
      fixed: "right",
      render: (_, row) => (
        <Select
          value={row.decision}
          disabled={!editable}
          aria-label={t("reviewDecisionFor", { description: row.description })}
          className="w-full"
          options={decisionOptions.map((option) => ({
            ...option,
            disabled: option.value === "INCLUDE_EXPENSE" && !canIncludeAsExpense(row),
          }))}
          onChange={(decision: StatementRowDecision) => patchRow(row.id, { decision })}
        />
      ),
    },
  ];

  if (loading && !statementImport) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
        <TableSkeleton rows={7} columns={6} />
      </div>
    );
  }

  if (!statementImport) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
        <Card>
          <p role="alert" className="text-sm text-[var(--rose)]">{error ?? t("statementNotFound")}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => router.push("/finance/statements")}>{t("backToStatements")}</Button>
        </Card>
      </div>
    );
  }

  const status = STATUS_META[statementImport.status];

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button type="button" variant="ghost" size="sm" className="mb-2" onClick={() => router.push("/finance/statements")}>
            ← {t("backToStatements")}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">
              {statementImport.sourceFileName || t("statementReview")}
            </h1>
             <Badge variant={status.variant}>{statusLabels[statementImport.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--text-3)]">
             {t("versionUploaded", { version: statementImport.version, date: formatDate(statementImport.createdAt, { dateStyle: "medium", timeStyle: "short" }) })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {editable && (
            <>
              <Button type="button" variant="outline" loading={saving} disabled={changedRows.length === 0} onClick={() => void saveRows()}>
                 {t("saveReview")}
              </Button>
              <Button type="button" variant="success" disabled={!canConfirm} onClick={() => setConfirmOpen(true)}>
                 {t("confirmExpenses")}
              </Button>
            </>
          )}
          {statementImport.status === "CONFIRMED" && (
            <Button type="button" variant="danger" onClick={() => setRevertOpen(true)}>
               {t("revertImport")}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => void load()} disabled={loading}>
             {t("reload")}
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mb-4 rounded-xl border border-[var(--emerald)]/40 bg-[var(--emerald-dim)] px-4 py-3 text-sm text-[var(--emerald-text)]">
          {notice}
        </div>
      )}
      {cardsError && editable && (
        <div role="status" className="mb-4 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold-dim)] px-4 py-3 text-sm text-[var(--gold-text)]">
           {t("creditCardsLoadFallback")}
        </div>
      )}
      {statementImport.failureMessage && (
        <div role="alert" className="mb-4 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]">
          {statementImport.failureMessage}
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
         <Card title={t("reconciliation")} className="!p-5 lg:col-span-2">
          {statementImport.reconciliation ? (
            <div className="grid gap-3 sm:grid-cols-3">
               <div><p className="text-xs text-[var(--text-3)]">{t("openingBalance")}</p><p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(statementImport.reconciliation.openingBalance, "MXN")}</p></div>
               <div><p className="text-xs text-[var(--text-3)]">{t("charges")}</p><p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(statementImport.reconciliation.chargesTotal, "MXN")}</p></div>
               <div><p className="text-xs text-[var(--text-3)]">{t("payments")}</p><p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(statementImport.reconciliation.paymentsTotal, "MXN")}</p></div>
               <div><p className="text-xs text-[var(--text-3)]">{t("credits")}</p><p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(statementImport.reconciliation.creditsTotal, "MXN")}</p></div>
               <div><p className="text-xs text-[var(--text-3)]">{t("closingBalance")}</p><p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(statementImport.reconciliation.closingBalance, "MXN")}</p></div>
               <div><p className="text-xs text-[var(--text-3)]">{t("difference")}</p><p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(statementImport.reconciliation.difference, "MXN")}</p></div>
              <div className="sm:col-span-3">
                <Badge variant={reconciliationPassed ? "success" : "danger"}>{reconciliationStatusLabel(statementImport.reconciliation.status)}</Badge>
                {statementImport.reconciliation.message && <span className="ml-2 text-xs text-[var(--text-3)]">{statementImport.reconciliation.message}</span>}
              </div>
            </div>
          ) : (
             <p className="text-sm text-[var(--text-3)]">{t("reconciliationUnavailable")}</p>
          )}
        </Card>

         <Card title={t("reviewReadiness")} className="!p-5">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/40 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-[var(--text-1)]">
                <Badge variant={statementImport.isPaid ? "success" : "neutral"}>
                   {statementImport.isPaid ? t("paid") : t("unpaid")}
                </Badge>
              </p>
              {statementImport.isPaid && statementImport.paidAt && (
                <p className="mt-1 text-xs text-[var(--text-3)]">
                   {t("paidAt", { date: formatDate(statementImport.paidAt, { dateStyle: "medium", timeStyle: "short" }) })}
                </p>
              )}
            </div>
            <Switch
              checked={statementImport.isPaid}
              loading={togglingPaid}
               aria-label={statementImport.isPaid ? t("markStatementUnpaid") : t("markStatementPaid")}
              onChange={(checked) => void togglePaid(checked)}
            />
          </div>
          <div className="space-y-2 text-sm text-[var(--text-2)]">
             <p>{t("sourceRows", { count: formatNumber(rows.length) })}</p>
             <p>{t("expensesSelected", { count: formatNumber(includedRows.length) })}</p>
             <p>{t("pendingDecisions", { count: formatNumber(pendingCount) })}</p>
             <p>{t("parserWarnings", { count: formatNumber(statementImport.warningCount) })}</p>
          </div>
          {editable && blockers.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-[var(--gold-text)]">
              {blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
            </ul>
          )}
        </Card>
      </div>

      {statementImport.paymentTargets.length > 0 && (
         <Card title={t("paymentTargets")} className="mb-4 !p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statementImport.paymentTargets.map((target) => (
              <div key={target.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/40 p-3">
                <p className="text-xs text-[var(--text-3)]">{target.label}</p>
                <p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(target.amount, target.currency)}</p>
                 {target.dueDate && <p className="mt-1 text-xs text-[var(--text-3)]">{t("dueDate", { date: formatDate(target.dueDate, { dateStyle: "medium" }) })}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

       <Card title={t("statementRows")} className="!p-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-3)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--emerald)]" aria-hidden="true" />
             {t("readyToConfirm")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--gold)]" aria-hidden="true" />
             {t("pendingDecision")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--rose)]" aria-hidden="true" />
             {t("missingRequiredData")}
          </span>
         </div>
        {editable && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/40 p-3">
            <p role="status" aria-live="polite" className="mr-auto text-sm font-medium text-[var(--text-1)]">
              {t("statementRowsSelected", { count: formatNumber(selectedRowIds.length) })}
            </p>
            <Button type="button" size="sm" variant="tinted" disabled={selectedRows.length === 0} onClick={() => applyBulkDecision("INCLUDE_EXPENSE")}>
              {t("includeExpense")}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={selectedRows.length === 0} onClick={() => applyBulkDecision("EXCLUDE")}>
              {t("exclude")}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={selectedRows.length === 0} onClick={() => applyBulkDecision("INFO_ONLY")}>
              {t("informationOnly")}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={selectedRows.length === 0} onClick={() => setSelectedRowIds([])}>
              {t("clearSelection")}
            </Button>
          </div>
        )}
        <Table<StatementRow>
          rowKey="id"
          dataSource={rows}
          columns={columns}
          rowSelection={rowSelection}
          pagination={false}
          scroll={{ x: 1270 }}
          size="small"
          className="[&_.ant-table-row-selected>td]:!bg-transparent [&_.ant-table-row-selected>td]:shadow-[inset_0_1px_0_color-mix(in_oklch,var(--emerald)_55%,transparent),inset_0_-1px_0_color-mix(in_oklch,var(--emerald)_55%,transparent)]"
          onRow={(row) => ({
            style: { backgroundColor: rowTint(row, hasDefaultCard) },
          })}
        />
      </Card>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmImport}
         title={t("createReviewedExpenses")}
         description={t("createReviewedDescription", { count: formatNumber(includedRows.length), expenses: t(includedRows.length === 1 ? "expenseWord" : "expensesWord") })}
         confirmLabel={t("confirmExpenses")}
         confirmingLabel={t("confirming")}
        confirmVariant="success"
        loading={confirming}
      />

      <ConfirmModal
        open={revertOpen}
        onClose={() => setRevertOpen(false)}
        onConfirm={revertImport}
         title={t("revertImportedExpenses")}
         description={t("revertDescription")}
         confirmLabel={t("revertImport")}
         confirmingLabel={t("reverting")}
        loading={reverting}
      />
    </div>
  );
}
