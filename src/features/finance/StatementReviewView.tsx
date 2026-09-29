"use client";

import { Input, InputNumber, Select, Table, type TableColumnsType, type TableProps } from "antd";
import { cloneElement, useCallback, useEffect, useMemo, useRef, useState, type AriaAttributes, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TableSkeleton } from "@/components/ui/ContentSkeleton";
import { MarkStatementPaidModal } from "./MarkStatementPaidModal";
import type { StatementPaymentFormValue } from "./MarkStatementPaidModal";
import { StatementPaymentHistory } from "./StatementPaymentHistory";
import {
  confirmStatementImportAction,
  correctStatementPaymentAction,
  createCategoryAction,
  createStatementPaymentAction,
  getCategoriesAction,
  getStatementImportAction,
  resumeStatementImportAction,
  revertStatementImportAction,
  updateStatementRowsAction,
  voidStatementPaymentAction,
} from "@/lib/userActions";
import { toCalendarDate, type Category } from "./finance.types";
import type {
  StatementImportDetail,
  StatementImportStatus,
  StatementPayment,
  StatementReconciliationStatus,
  StatementRow,
  StatementRowDecision,
  StatementRowKind,
  StatementSection,
  UpdateStatementRowPayload,
} from "./statement-import.types";
import { canIncludeAsExpense, STATUS_META } from "./statement-import.utils";
import { categoryKeyOf, planStatementCategorization } from "./statementCategorization";
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

const MAX_CHANGED_STATEMENT_ROWS = 200;
const STATEMENT_ROWS_SCROLL_HEIGHT = 600;
type StatementRowFilter = "ALL" | "PENDING" | "MISSING_CATEGORY" | "READY" | "ADJUSTED";

function sameMoney(left: number | string, right: number | string) {
  return Math.round(Number(left) * 100) === Math.round(Number(right) * 100);
}

function sameInstant(left?: string | null, right?: string | null) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return new Date(left).getTime() === new Date(right).getTime();
}

function hasAccountingAdjustment(row: StatementRow) {
  return (
    !sameInstant(row.transactionDate, row.parsedTransactionDate) ||
    !sameMoney(row.amount, row.parsedAmount) ||
    row.currency !== row.parsedCurrency ||
    row.kind !== row.parsedKind
  );
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
  const translationRef = useRef(t);
  useEffect(() => {
    translationRef.current = t;
  }, [t]);
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
  const [drafts, setDrafts] = useState<Record<string, UpdateStatementRowPayload>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentToCorrect, setPaymentToCorrect] = useState<StatementPayment>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [reloadConfirmOpen, setReloadConfirmOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [rowFilter, setRowFilter] = useState<StatementRowFilter>("ALL");
  const [bulkCategoryId, setBulkCategoryId] = useState<string>();
  const [revealedMerchantIds, setRevealedMerchantIds] = useState<Set<string>>(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    setNotice(undefined);
    setSelectedRowIds([]);
    setBulkCategoryId(undefined);
    setRevealedMerchantIds(new Set());

    const [detailResult, categoriesResult] = await Promise.all([
      getStatementImportAction(statementImportId),
      getCategoriesAction(),
    ]);

    if (detailResult.sessionExpired || categoriesResult.sessionExpired) {
      router.push("/user-login");
      return;
    }

    if (detailResult.error || !detailResult.data) {
      setError(frontendError(detailResult.error, translationRef.current, "statementLoadFailed"));
      setLoading(false);
      return;
    }

    setStatementImport(detailResult.data);
    setDrafts({});

    if (categoriesResult.error) {
      setError(frontendError(categoriesResult.error, translationRef.current, "requestFailedGeneric"));
    }
    else setCategories(categoriesResult.data ?? []);

    setLoading(false);
  }, [router, statementImportId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const wouldExceedDraftLimit = (targetRowIds: string[]) =>
    new Set([...Object.keys(drafts), ...targetRowIds]).size > MAX_CHANGED_STATEMENT_ROWS;

  const patchRow = (id: string, patch: Omit<UpdateStatementRowPayload, "id">) => {
    if (wouldExceedDraftLimit([id])) {
      setError(t("saveMaxRows"));
      return;
    }

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
        isAdjusted: hasAccountingAdjustment({ ...row, ...drafts[row.id] }),
      })),
    [drafts, statementImport?.rows],
  );

  const editable = statementImport?.status === "NEEDS_REVIEW";
  const hasDefaultCard = Boolean(statementImport?.creditCardId);
  const filteredRows = useMemo(() => {
    switch (rowFilter) {
      case "PENDING":
        return rows.filter((row) => row.decision === "PENDING");
      case "MISSING_CATEGORY":
        return rows.filter(
          (row) =>
            canIncludeAsExpense(row) &&
            !row.categoryId &&
            (row.decision === "PENDING" || row.decision === "INCLUDE_EXPENSE"),
        );
      case "READY":
        return rows.filter(
          (row) => row.decision === "INCLUDE_EXPENSE" && isIncludedRowValid(row, hasDefaultCard),
        );
      case "ADJUSTED":
        return rows.filter((row) => row.isAdjusted);
      default:
        return rows;
    }
  }, [hasDefaultCard, rowFilter, rows]);
  const filteredRowIdSet = useMemo(() => new Set(filteredRows.map((row) => row.id)), [filteredRows]);
  const selectedRowIdSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);
  const selectedRows = filteredRows.filter((row) => selectedRowIdSet.has(row.id));
  const selectedIncludableRows = selectedRows.filter(canIncludeAsExpense);
  const changedRows = Object.values(drafts);
  const includedRows = rows.filter((row) => row.decision === "INCLUDE_EXPENSE");
  const pendingCount = rows.filter((row) => row.decision === "PENDING").length;
  const invalidIncludedRows = includedRows.filter((row) => !isIncludedRowValid(row, hasDefaultCard));
  const adjustedRows = rows.filter((row) => row.isAdjusted);
  const adjustedRowsMissingReason = adjustedRows.filter(
    (row) => !row.decisionNote?.trim(),
  );
  const reconciliationPassed = statementImport?.reconciliation?.status === "PASSED";
  const canConfirm = Boolean(
    editable &&
      reconciliationPassed &&
      pendingCount === 0 &&
      includedRows.length > 0 &&
      invalidIncludedRows.length === 0 &&
      adjustedRowsMissingReason.length === 0 &&
      changedRows.length === 0,
  );

  useEffect(() => {
    if (changedRows.length === 0) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [changedRows.length]);

  const blockers = [
    !reconciliationPassed ? t("reconciliationMustPass") : undefined,
    pendingCount > 0 ? t("rowsStillPending", { count: formatNumber(pendingCount), rows: t(pendingCount === 1 ? "rowIs" : "rowsAre") }) : undefined,
    includedRows.length === 0 ? t("atLeastOneExpense") : undefined,
    invalidIncludedRows.length > 0
      ? t("rowsMissingData", { count: formatNumber(invalidIncludedRows.length), rows: t(invalidIncludedRows.length === 1 ? "rowIs" : "rowsAre") })
      : undefined,
    adjustedRowsMissingReason.length > 0
      ? t("adjustmentReasonsMissing", { count: formatNumber(adjustedRowsMissingReason.length) })
      : undefined,
    changedRows.length > 0 ? t("saveBeforeConfirmation") : undefined,
  ].filter((value): value is string => Boolean(value));

  const saveRows = async () => {
    if (!statementImport || changedRows.length === 0) return;
    if (changedRows.length > MAX_CHANGED_STATEMENT_ROWS) {
      setError(t("saveMaxRows"));
      return;
    }
    if (invalidIncludedRows.length > 0) {
      setError(t("includedExpenseRequirements"));
      return;
    }
    if (adjustedRowsMissingReason.length > 0) {
      setError(t("adjustmentReasonsMissing", { count: formatNumber(adjustedRowsMissingReason.length) }));
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

  const resumeImport = async () => {
    if (!statementImport || statementImport.status !== "REVERTED") return;
    setResuming(true);
    setError(undefined);
    const result = await resumeStatementImportAction(statementImport.id, {
      version: statementImport.version,
    });
    setResuming(false);

    if (result.sessionExpired) {
      router.push("/user-login");
      return;
    }
    if (result.error || !result.data) {
      setError(frontendError(result.error, t, "resumeImportFailed"));
      return;
    }

    setStatementImport(result.data);
    setNotice(t("importResumed"));
  };

  // Re-fetches the detail so paymentVersion and the ledger stay current.
  // Returns true only when the fresh detail was applied.
  const reloadStatementDetail = async () => {
    if (!statementImport) return false;
    const detailResult = await getStatementImportAction(statementImport.id);

    if (detailResult.sessionExpired) {
      router.push("/user-login");
      return false;
    }
    if (detailResult.error || !detailResult.data) {
      setError(frontendError(detailResult.error, t, "paidStatusFailed"));
      return false;
    }
    const returnedRowIds = new Set(detailResult.data.rows.map((row) => row.id));
    setSelectedRowIds((current) => current.filter((id) => returnedRowIds.has(id)));
    setStatementImport(detailResult.data);
    router.refresh();
    return true;
  };

  const failPaymentWrite = async (result: { error?: string; sessionExpired?: boolean }) => {
    if (result.sessionExpired) {
      setPaymentLoading(false);
      router.push("/user-login");
      return;
    }
    // A stale-version conflict (409) or any other failure may mean the ledger
    // moved on: refetch so the next attempt uses the current paymentVersion.
    const reloaded = await reloadStatementDetail();
    if (reloaded) setError(frontendError(result.error, t, "paidStatusFailed"));
    setPaymentLoading(false);
  };

  const recordPayment = async (value: StatementPaymentFormValue) => {
    if (!statementImport) return;
    setPaymentLoading(true);
    setError(undefined);
    const result = await createStatementPaymentAction(statementImport.id, {
      amount: value.amount,
      currency: value.currency,
      paidAt: value.paidAt,
      note: value.note,
      expectedVersion: statementImport.paymentVersion,
      idempotencyKey: crypto.randomUUID(),
    });
    if (result.error || !result.data) {
      await failPaymentWrite(result);
      return;
    }
    const refreshed = await reloadStatementDetail();
    setPaymentLoading(false);
    if (!refreshed) return;
    setPaymentModalOpen(false);
    setNotice(t("paymentRecorded"));
  };

  const correctPayment = async (value: StatementPaymentFormValue) => {
    if (!statementImport || !paymentToCorrect || !value.reason) return;
    setPaymentLoading(true);
    setError(undefined);
    const result = await correctStatementPaymentAction(paymentToCorrect.id, {
      amount: value.amount,
      currency: value.currency,
      paidAt: value.paidAt,
      note: value.note,
      reason: value.reason,
      expectedVersion: statementImport.paymentVersion,
      idempotencyKey: crypto.randomUUID(),
    });
    if (result.error || !result.data) {
      await failPaymentWrite(result);
      return;
    }
    const refreshed = await reloadStatementDetail();
    setPaymentLoading(false);
    if (!refreshed) return;
    setPaymentToCorrect(undefined);
    setNotice(t("paymentCorrected"));
  };

  const voidPayment = async (payment: StatementPayment, reason: string) => {
    if (!statementImport) return;
    setPaymentLoading(true);
    setError(undefined);
    const result = await voidStatementPaymentAction(payment.id, {
      expectedVersion: statementImport.paymentVersion,
      reason,
    });
    if (result.error || !result.data) {
      await failPaymentWrite(result);
      return;
    }
    const refreshed = await reloadStatementDetail();
    setPaymentLoading(false);
    if (!refreshed) return;
    setNotice(t("paymentVoided"));
  };

  const applyBulkPatch = (
    targetRows: StatementRow[],
    patch: Omit<UpdateStatementRowPayload, "id">,
  ) => {
    const targetRowIds = targetRows.map((row) => row.id);
    if (wouldExceedDraftLimit(targetRowIds)) {
      setError(t("bulkDraftLimitExceeded"));
      return false;
    }

    setDrafts((current) => {
      const next = { ...current };
      targetRows.forEach((row) => {
        next[row.id] = { ...next[row.id], ...patch, id: row.id };
      });
      return next;
    });
    const processedRowIds = new Set(targetRowIds);
    setSelectedRowIds((current) => current.filter((id) => !processedRowIds.has(id)));
    setError(undefined);
    setNotice(undefined);
    return true;
  };

  const applyBulkDecision = (decision: StatementRowDecision) => {
    if (!editable || selectedRows.length === 0) return;

    if (decision === "INCLUDE_EXPENSE") {
      if (!applyBulkPatch(selectedIncludableRows, { decision })) return;
      const skippedCount = selectedRows.length - selectedIncludableRows.length;
      if (skippedCount > 0) {
        setNotice(t("bulkIncludeSkipped", { count: formatNumber(skippedCount) }));
      }
      return;
    }

    applyBulkPatch(selectedRows, { decision });
  };

  const includeAndCategorizeSelectedRows = () => {
    if (!editable || !bulkCategoryId || selectedIncludableRows.length === 0) return;

    if (!applyBulkPatch(selectedIncludableRows, {
      decision: "INCLUDE_EXPENSE",
      categoryId: bulkCategoryId,
    })) return;

    const skippedCount = selectedRows.length - selectedIncludableRows.length;
    if (skippedCount > 0) {
      setNotice(t("bulkIncludeSkipped", { count: formatNumber(skippedCount) }));
    }
  };

  const autoCategorizeRows = async () => {
    if (!editable || categorizing) return;

    const plan = planStatementCategorization(rows, categories);
    const targetRowIds = Object.keys(plan.rowCategoryKeys);
    if (targetRowIds.length === 0) {
      setNotice(t("autoCategorizeNoneNeeded"));
      return;
    }
    if (wouldExceedDraftLimit(targetRowIds)) {
      setError(t("bulkDraftLimitExceeded"));
      return;
    }

    setCategorizing(true);
    setError(undefined);
    setNotice(undefined);

    let workingCategories = categories;
    if (plan.categoriesToCreate.length > 0) {
      const createdCategories: Category[] = [];
      for (const category of plan.categoriesToCreate) {
        const result = await createCategoryAction({ name: category.name, icon: category.icon });
        if (result.sessionExpired) {
          router.push("/user-login");
          return;
        }
        if (result.error || !result.data) {
          setCategorizing(false);
          setError(frontendError(result.error, t, "requestFailedGeneric"));
          return;
        }
        createdCategories.push(result.data);
      }
      workingCategories = [...categories, ...createdCategories];
      setCategories(workingCategories);
    }

    const categoryIdByKey = new Map(workingCategories.map((category) => [categoryKeyOf(category), category.id]));
    const rowById = new Map(rows.map((row) => [row.id, row]));

    setDrafts((current) => {
      const next = { ...current };
      for (const [rowId, key] of Object.entries(plan.rowCategoryKeys)) {
        const categoryId = categoryIdByKey.get(key);
        const row = rowById.get(rowId);
        if (!categoryId || !row) continue;
        next[rowId] = {
          ...next[rowId],
          id: rowId,
          categoryId,
          decision: row.decision === "PENDING" ? "INCLUDE_EXPENSE" : row.decision,
        };
      }
      return next;
    });

    setCategorizing(false);
    setNotice(
      t("autoCategorizeApplied", {
        count: formatNumber(targetRowIds.length),
        created: formatNumber(plan.categoriesToCreate.length),
      }),
    );
  };

  const requestReload = () => {
    if (changedRows.length > 0) {
      setReloadConfirmOpen(true);
      return;
    }
    void load();
  };

  const discardDraftsAndReload = () => {
    setReloadConfirmOpen(false);
    void load();
  };

  const rowSelection: TableProps<StatementRow>["rowSelection"] = editable
    ? {
        selectedRowKeys: selectedRowIds,
        onChange: (selectedKeys) => setSelectedRowIds(
          selectedKeys.map(String).filter((id) => filteredRowIdSet.has(id)),
        ),
        preserveSelectedRowKeys: true,
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
              {!sameInstant(row.transactionDate, row.parsedTransactionDate) && (
                <p className="mt-1 text-xs text-[var(--gold-text)]">
                  {t("originalReviewedValue", {
                    original: toCalendarDate(row.parsedTransactionDate) || "—",
                    reviewed: toCalendarDate(row.transactionDate) || "—",
                  })}
                </p>
              )}
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
          {row.kind !== row.parsedKind && (
            <p className="text-xs text-[var(--gold-text)]">
              {t("originalReviewedValue", {
                original: rowKindLabel(row.parsedKind),
                reviewed: rowKindLabel(row.kind),
              })}
            </p>
          )}
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
        <div>
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
          {(!sameMoney(row.amount, row.parsedAmount) || row.currency !== row.parsedCurrency) && (
            <p className="mt-1 text-xs text-[var(--gold-text)]">
              {t("originalReviewedValue", {
                original: formatMoney(row.parsedAmount, row.parsedCurrency),
                reviewed: formatMoney(row.amount, row.currency),
              })}
            </p>
          )}
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
      title: t("decision"),
      width: 260,
      fixed: "right",
      render: (_, row) => (
        <div className="space-y-2">
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
          {(row.isAdjusted || Boolean(row.decisionNote)) && (
            <Input.TextArea
              value={row.decisionNote ?? ""}
              disabled={!editable}
              maxLength={500}
              autoSize={{ minRows: 2, maxRows: 4 }}
              aria-label={t("adjustmentReasonFor", { description: row.description })}
              placeholder={t("adjustmentReason")}
              status={row.isAdjusted && !row.decisionNote?.trim() ? "error" : undefined}
              onChange={(event) => patchRow(row.id, { decisionNote: event.target.value || null })}
            />
          )}
        </div>
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
  const reconciliationDifferenceTone = statementImport.reconciliation?.status === "PASSED"
    ? {
        surface: "border-[var(--emerald)]/30 bg-[var(--emerald-dim)]",
        text: "text-[var(--emerald-text)]",
      }
    : statementImport.reconciliation?.status === "PENDING"
      ? {
          surface: "border-[var(--gold)]/30 bg-[var(--gold-dim)]",
          text: "text-[var(--gold-text)]",
        }
      : {
          surface: "border-[var(--rose)]/30 bg-[var(--rose)]/10",
          text: "text-[var(--rose)]",
        };

  return (
    <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Button type="button" variant="ghost" size="sm" className="mb-2 !px-2" onClick={() => router.push("/finance/statements")}>
            ← {t("backToStatements")}
          </Button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="min-w-0 break-words font-serif text-2xl font-semibold leading-tight text-[var(--text-1)] sm:text-3xl">
              {statementImport.sourceFileName || t("statementReview")}
            </h1>
            <Badge variant={status.variant}>{statusLabels[statementImport.status]}</Badge>
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-3)] sm:text-sm">
            {t("versionUploaded", { version: statementImport.version, date: formatDate(statementImport.createdAt, { dateStyle: "medium", timeStyle: "short" }) })}
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={requestReload} disabled={loading}>
            {t("reload")}
          </Button>
          {editable && (
            <>
              <Button type="button" variant="tinted" size="sm" loading={saving} disabled={changedRows.length === 0} onClick={() => void saveRows()}>
                {t("saveReview")}
              </Button>
              <Button type="button" variant="tinted" size="sm" disabled={!canConfirm} onClick={() => setConfirmOpen(true)}>
                {t("confirmExpenses")}
              </Button>
            </>
          )}
          {statementImport.status === "CONFIRMED" && (
            <Button type="button" variant="danger" size="sm" onClick={() => setRevertOpen(true)}>
              {t("revertImport")}
            </Button>
          )}
          {statementImport.status === "REVERTED" && (
            <Button type="button" variant="tinted" size="sm" loading={resuming} onClick={() => void resumeImport()}>
              {t("resumeImport")}
            </Button>
          )}
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
      {statementImport.failureMessage && (
        <div role="alert" className="mb-4 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]">
          {statementImport.failureMessage}
        </div>
      )}

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="!p-4 sm:!p-5 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-soft)] pb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-1)]">{t("bankReconciliation")}</h2>
              {statementImport.reconciliation?.message && (
                <p className="mt-1 max-w-2xl text-xs text-[var(--text-3)]">
                  {statementImport.reconciliation.message}
                </p>
              )}
            </div>
            {statementImport.reconciliation && (
              <Badge
                variant={statementImport.reconciliation.status === "PASSED"
                  ? "success"
                  : statementImport.reconciliation.status === "FAILED"
                    ? "danger"
                    : "warning"}
              >
                {reconciliationStatusLabel(statementImport.reconciliation.status)}
              </Badge>
            )}
          </div>
          {statementImport.reconciliation ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/45 p-3 sm:p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-3)]">{t("openingBalance")}</p>
                <p className="mt-2 break-words font-mono text-sm font-semibold text-[var(--text-1)] sm:text-base">{formatMoney(statementImport.reconciliation.openingBalance, statementImport.reconciliation.currency)}</p>
              </div>
              <div className="rounded-xl border border-[var(--rose)]/20 bg-[var(--rose)]/5 p-3 sm:p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--rose)]">{t("charges")}</p>
                <p className="mt-2 break-words font-mono text-sm font-semibold text-[var(--text-1)] sm:text-base">{formatMoney(statementImport.reconciliation.chargesTotal, statementImport.reconciliation.currency)}</p>
              </div>
              <div className="rounded-xl border border-[var(--emerald)]/20 bg-[var(--emerald-dim)] p-3 sm:p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--emerald-text)]">{t("payments")}</p>
                <p className="mt-2 break-words font-mono text-sm font-semibold text-[var(--text-1)] sm:text-base">{formatMoney(statementImport.reconciliation.paymentsTotal, statementImport.reconciliation.currency)}</p>
              </div>
              <div className="rounded-xl border border-[var(--gold)]/20 bg-[var(--gold-dim)] p-3 sm:p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--gold-text)]">{t("credits")}</p>
                <p className="mt-2 break-words font-mono text-sm font-semibold text-[var(--text-1)] sm:text-base">{formatMoney(statementImport.reconciliation.creditsTotal, statementImport.reconciliation.currency)}</p>
              </div>
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/45 p-3 sm:p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-3)]">{t("closingBalance")}</p>
                <p className="mt-2 break-words font-mono text-sm font-semibold text-[var(--text-1)] sm:text-base">{formatMoney(statementImport.reconciliation.closingBalance, statementImport.reconciliation.currency)}</p>
              </div>
              <div className={`rounded-xl border p-3 sm:p-4 ${reconciliationDifferenceTone.surface}`}>
                <p className={`text-[11px] font-medium uppercase tracking-wide ${reconciliationDifferenceTone.text}`}>{t("difference")}</p>
                <p className={`mt-2 break-words font-mono text-sm font-semibold sm:text-base ${reconciliationDifferenceTone.text}`}>{formatMoney(statementImport.reconciliation.difference, statementImport.reconciliation.currency)}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-3)]/30 px-4 py-8 text-center text-sm text-[var(--text-3)]">
              {t("reconciliationUnavailable")}
            </div>
          )}
        </Card>

        <Card className="!p-4 sm:!p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-4">
            <h2 className="text-sm font-semibold text-[var(--text-1)]">{t("reviewAdjustments")}</h2>
            <Badge variant={status.variant}>{statusLabels[statementImport.status]}</Badge>
          </div>
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/45 px-3 py-2.5">
            <div>
              <Badge variant={statementImport.paymentStatus === "PAID" ? "success" : statementImport.paymentStatus === "PARTIAL" ? "warning" : "neutral"}>
                {statementImport.paymentStatus === "PAID" ? t("paid") : statementImport.paymentStatus === "PARTIAL" ? t("partial") : t("unpaid")}
              </Badge>
              {statementImport.paidAt && (
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  {t("paidAt", { date: formatDate(statementImport.paidAt, { dateStyle: "medium", timeStyle: "short" }) })}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="success"
              size="sm"
              disabled={paymentLoading || statementImport.status !== "CONFIRMED" || !statementImport.paymentSummary.currency}
              onClick={() => setPaymentModalOpen(true)}
            >
              {t("recordPayment")}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-2)]">
            <p className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-3)]/30 px-3 py-2.5">{t("sourceRows", { count: formatNumber(rows.length) })}</p>
            <p className="rounded-lg border border-[var(--emerald)]/20 bg-[var(--emerald-dim)] px-3 py-2.5 text-[var(--emerald-text)]">{t("expensesSelected", { count: formatNumber(includedRows.length) })}</p>
            <p className="rounded-lg border border-[var(--gold)]/20 bg-[var(--gold-dim)] px-3 py-2.5 text-[var(--gold-text)]">{t("pendingDecisions", { count: formatNumber(pendingCount) })}</p>
            <p className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-3)]/30 px-3 py-2.5">{t("parserWarnings", { count: formatNumber(statementImport.warningCount) })}</p>
            <p className="rounded-lg border border-[var(--gold)]/20 bg-[var(--gold-dim)] px-3 py-2.5 text-[var(--gold-text)]">{t("reviewAdjustmentsCount", { count: formatNumber(adjustedRows.length) })}</p>
          </div>
          {editable && blockers.length > 0 && (
            <div className="mt-3 rounded-xl border border-[var(--gold)]/25 bg-[var(--gold-dim)] p-3">
              <ul className="space-y-1.5 text-xs leading-relaxed text-[var(--gold-text)]">
                {blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
              </ul>
            </div>
          )}
          {editable && blockers.length === 0 && (
            <div className="mt-3 rounded-xl border border-[var(--emerald)]/25 bg-[var(--emerald-dim)] px-3 py-2.5 text-xs text-[var(--emerald-text)]">
              {t("readyToConfirm")}
            </div>
          )}
        </Card>
      </div>

      <StatementPaymentHistory
        payments={statementImport.paymentHistory}
        loading={paymentLoading}
        onCorrect={setPaymentToCorrect}
        onVoid={voidPayment}
      />

      {statementImport.paymentTargets.length > 0 && (
        <Card className="mb-4 !p-4 sm:!p-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-4">
            <h2 className="text-sm font-semibold text-[var(--text-1)]">{t("paymentTargets")}</h2>
            <Badge ring>{formatNumber(statementImport.paymentTargets.length)}</Badge>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {statementImport.paymentTargets.map((target) => (
              <div key={target.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/45 p-3">
                <p className="truncate text-xs font-medium text-[var(--text-2)]" title={target.label}>{target.label}</p>
                <p className="mt-1.5 break-words font-mono text-sm font-semibold text-[var(--text-1)]">{formatMoney(target.amount, target.currency)}</p>
                {target.dueDate && <p className="mt-1 text-[11px] text-[var(--text-3)]">{t("dueDate", { date: formatDate(target.dueDate, { dateStyle: "medium" }) })}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="!p-3 sm:!p-4">
        <div className="mb-3 flex flex-col gap-3 border-b border-[var(--border-soft)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-1)]">{t("statementRows")}</h2>
            <p className="mt-1 text-xs text-[var(--text-3)]">{t("sourceRows", { count: formatNumber(rows.length) })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--emerald)]/20 bg-[var(--emerald-dim)] px-2.5 py-1 text-[var(--emerald-text)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--emerald)]" aria-hidden="true" />
              {t("readyToConfirm")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/20 bg-[var(--gold-dim)] px-2.5 py-1 text-[var(--gold-text)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" aria-hidden="true" />
              {t("pendingDecision")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rose)]/20 bg-[var(--rose)]/10 px-2.5 py-1 text-[var(--rose)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--rose)]" aria-hidden="true" />
              {t("missingRequiredData")}
            </span>
          </div>
        </div>
        <div className="mb-3 flex flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/30 p-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 sm:w-56">
            <label htmlFor="statement-row-filter" className="mb-1 block text-xs font-medium text-[var(--text-3)]">
              {t("filterStatementRows")}
            </label>
            <Select<StatementRowFilter>
              id="statement-row-filter"
              value={rowFilter}
              aria-label={t("filterStatementRows")}
              className="w-full"
              options={[
                { value: "ALL", label: t("statementFilterAll") },
                { value: "PENDING", label: t("statementFilterPending") },
                { value: "MISSING_CATEGORY", label: t("statementFilterMissingCategory") },
                { value: "READY", label: t("statementFilterReady") },
                { value: "ADJUSTED", label: t("statementFilterAdjusted") },
              ]}
              onChange={(nextFilter) => {
                setRowFilter(nextFilter);
                setSelectedRowIds([]);
              }}
            />
          </div>
          <p role="status" aria-live="polite" className="text-xs text-[var(--text-3)] sm:mr-auto sm:pb-2">
            {t("filteredStatementRowsCount", {
              filtered: formatNumber(filteredRows.length),
              total: formatNumber(rows.length),
            })}
          </p>
          {editable && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="tinted"
                loading={categorizing}
                onClick={() => void autoCategorizeRows()}
              >
                {t("autoCategorize")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={filteredRows.length === 0}
                aria-label={t("selectAllFilteredStatementRows", { count: formatNumber(filteredRows.length) })}
                onClick={() => setSelectedRowIds(filteredRows.map((row) => row.id))}
              >
                {t("selectAllFilteredStatementRows", { count: formatNumber(filteredRows.length) })}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={selectedRows.length === 0}
                aria-label={t("clearSelection")}
                onClick={() => setSelectedRowIds([])}
              >
                {t("clearSelection")}
              </Button>
            </div>
          )}
        </div>
        {editable && (
          <div className="mb-3 flex flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-2)]/95 p-3 shadow-sm backdrop-blur md:flex-row md:items-center">
            <div className="md:mr-auto">
              <p role="status" aria-live="polite" className="text-xs font-medium text-[var(--text-2)] md:text-sm">
                {t("statementRowsSelected", { count: formatNumber(selectedRows.length) })}
              </p>
              <p className="mt-1 text-xs text-[var(--text-3)]">
                {t("bulkCategorizationEligibility", {
                  eligible: formatNumber(selectedIncludableRows.length),
                  selected: formatNumber(selectedRows.length),
                })}
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              <div className="min-w-52 flex-1 sm:flex-none">
                <label htmlFor="statement-bulk-category" className="sr-only">
                  {t("bulkCategory")}
                </label>
                <Select
                  id="statement-bulk-category"
                  allowClear
                  value={bulkCategoryId}
                  disabled={selectedIncludableRows.length === 0}
                  placeholder={t("bulkCategory")}
                  aria-label={t("bulkCategory")}
                  className="w-full sm:w-52"
                  options={categories.map((category) => ({
                    value: category.id,
                    label: `${category.icon ?? ""} ${category.name}`.trim(),
                  }))}
                  onChange={(value) => setBulkCategoryId(value)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="success"
                disabled={selectedIncludableRows.length === 0 || !bulkCategoryId}
                onClick={includeAndCategorizeSelectedRows}
              >
                {t("includeAndCategorizeRows", { count: formatNumber(selectedIncludableRows.length) })}
              </Button>
              <Button type="button" size="sm" variant="tinted" disabled={selectedIncludableRows.length === 0} onClick={() => applyBulkDecision("INCLUDE_EXPENSE")}>
                {t("includeExpense")}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={selectedRows.length === 0} onClick={() => applyBulkDecision("EXCLUDE")}>
                {t("exclude")}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={selectedRows.length === 0} onClick={() => applyBulkDecision("INFO_ONLY")}>
                {t("informationOnly")}
              </Button>
            </div>
          </div>
        )}
        <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-2)]/50">
          <Table<StatementRow>
            rowKey="id"
            dataSource={filteredRows}
            columns={columns}
            rowSelection={rowSelection}
            pagination={{
              defaultPageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              showTotal: (total) => t("sourceRows", { count: formatNumber(total) }),
            }}
            scroll={{ x: 1050, y: STATEMENT_ROWS_SCROLL_HEIGHT }}
            size="small"
            className="[&_.ant-table]:!bg-transparent [&_.ant-table-container]:!border-0 [&_.ant-table-row-selected>td]:!bg-transparent [&_.ant-table-row-selected>td]:shadow-[inset_0_1px_0_color-mix(in_oklch,var(--emerald)_55%,transparent),inset_0_-1px_0_color-mix(in_oklch,var(--emerald)_55%,transparent)] [&_.ant-table-thead>tr>th]:!text-[11px] [&_.ant-table-thead>tr>th]:!uppercase [&_.ant-table-thead>tr>th]:!tracking-wide"
            onRow={(row) => ({
              style: { backgroundColor: rowTint(row, hasDefaultCard) },
            })}
          />
        </div>
      </Card>

      <ConfirmModal
        open={reloadConfirmOpen}
        onClose={() => setReloadConfirmOpen(false)}
        onConfirm={discardDraftsAndReload}
        title={t("reloadDiscardChangesTitle")}
        description={t("reloadDiscardChangesDescription")}
        confirmLabel={t("discardAndReload")}
        confirmVariant="danger"
      />

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

      <MarkStatementPaidModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onConfirm={recordPayment}
        defaultAmount={statementImport.paymentSummary.currentPaymentDue}
        defaultCurrency={statementImport.paymentSummary.currency}
        loading={paymentLoading}
      />

      <MarkStatementPaidModal
        open={Boolean(paymentToCorrect)}
        onClose={() => setPaymentToCorrect(undefined)}
        onConfirm={correctPayment}
        defaultAmount={paymentToCorrect ? Number(paymentToCorrect.amount) : undefined}
        defaultCurrency={paymentToCorrect?.currency}
        defaultPaidAt={paymentToCorrect?.paidAt}
        defaultNote={paymentToCorrect?.note}
        correction
        loading={paymentLoading}
      />
    </div>
  );
}
