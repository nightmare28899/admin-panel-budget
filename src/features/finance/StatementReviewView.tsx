"use client";

import { Input, InputNumber, Select, Table, type TableColumnsType } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TableSkeleton } from "@/components/ui/ContentSkeleton";
import {
  confirmStatementImportAction,
  getCategoriesAction,
  getCreditCardsAction,
  getStatementImportAction,
  revertStatementImportAction,
  updateStatementRowsAction,
} from "@/lib/userActions";
import { toCalendarDate, type Category } from "./finance.types";
import type {
  CreditCardSummary,
  StatementImportDetail,
  StatementImportStatus,
  StatementRow,
  StatementRowDecision,
  UpdateStatementRowPayload,
} from "./statement-import.types";

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

const EXPENSE_KINDS = new Set(["CHARGE", "INTEREST", "TAX"]);
const DECISION_OPTIONS: Array<{ value: StatementRowDecision; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "INCLUDE_EXPENSE", label: "Include as expense" },
  { value: "EXCLUDE", label: "Exclude" },
  { value: "INFO_ONLY", label: "Information only" },
];

function canIncludeAsExpense(row: StatementRow) {
  return row.section !== "CFDI" && EXPENSE_KINDS.has(row.kind);
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

function formatMoney(value: number | string, currency: string) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${currency} —`;
}

export function StatementReviewView({
  statementImportId,
}: {
  statementImportId: string;
}) {
  const router = useRouter();
  const [statementImport, setStatementImport] = useState<StatementImportDetail>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCardSummary[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UpdateStatementRowPayload>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [cardsError, setCardsError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    setNotice(undefined);

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
      setError(detailResult.error ?? "The statement import could not be loaded.");
      setLoading(false);
      return;
    }

    setStatementImport(detailResult.data);
    setDrafts({});

    if (categoriesResult.error) setError(categoriesResult.error);
    else setCategories(categoriesResult.data ?? []);

    if (cardsResult.error) {
      setCards([]);
      setCardsError(cardsResult.error);
    } else {
      setCards(cardsResult.data ?? []);
      setCardsError(undefined);
    }
    setLoading(false);
  }, [router, statementImportId]);

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
    !reconciliationPassed ? "Reconciliation must pass." : undefined,
    pendingCount > 0 ? `${pendingCount} row${pendingCount === 1 ? " is" : "s are"} still pending.` : undefined,
    includedRows.length === 0 ? "At least one row must be included as an expense." : undefined,
    invalidIncludedRows.length > 0
      ? `${invalidIncludedRows.length} included row${invalidIncludedRows.length === 1 ? " is" : "s are"} missing required data.`
      : undefined,
    changedRows.length > 0 ? "Save row changes before confirmation." : undefined,
  ].filter((value): value is string => Boolean(value));

  const saveRows = async () => {
    if (!statementImport || changedRows.length === 0) return;
    if (changedRows.length > 200) {
      setError("Save at most 200 changed rows at a time.");
      return;
    }
    if (invalidIncludedRows.length > 0) {
      setError("Every included expense needs an allowed type, date, category, card, positive amount, and valid currency.");
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
      setError(result.error ?? "The reviewed rows could not be saved.");
      return;
    }

    setStatementImport(result.data);
    setDrafts({});
    setNotice("Review changes saved.");
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
      setError(result.error ?? "The statement import could not be confirmed.");
      return;
    }

    setStatementImport(result.data.import);
    setNotice(`${result.data.createdExpenseCount} expense${result.data.createdExpenseCount === 1 ? " was" : "s were"} created.`);
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
      setError(result.error ?? "The statement import could not be reverted.");
      return;
    }

    setStatementImport(result.data.import);
    setNotice(`${result.data.deletedExpenseCount} imported expense${result.data.deletedExpenseCount === 1 ? " was" : "s were"} removed.`);
  };

  const columns: TableColumnsType<StatementRow> = [
    {
      title: "Transaction",
      width: 310,
      render: (_, row) => (
        <div className="space-y-2">
          <Input
            type="date"
            value={toCalendarDate(row.transactionDate)}
            disabled={!editable}
            aria-label={`Transaction date for ${row.description}`}
            onChange={(event) => {
              if (event.target.value) {
                patchRow(row.id, { transactionDate: `${event.target.value}T12:00:00.000Z` });
              }
            }}
          />
          <Input
            value={row.description}
            disabled={!editable}
            maxLength={240}
            aria-label={`Description for row ${row.position + 1}`}
            onChange={(event) => patchRow(row.id, { description: event.target.value })}
          />
          <Input
            value={row.merchantName ?? ""}
            disabled={!editable}
            maxLength={120}
            placeholder="Merchant"
            aria-label={`Merchant for row ${row.position + 1}`}
            onChange={(event) => patchRow(row.id, { merchantName: event.target.value || null })}
          />
        </div>
      ),
    },
    {
      title: "Type",
      width: 155,
      render: (_, row) => (
        <div className="space-y-2">
          <Badge variant={canIncludeAsExpense(row) ? "info" : "neutral"}>
            {row.kind.replaceAll("_", " ")}
          </Badge>
          <p className="text-xs text-[var(--text-3)]">{row.section.replaceAll("_", " ")}</p>
          {row.warningCodes?.map((warning) => (
            <p key={warning} className="text-xs text-[var(--gold-text)]">{warning.replaceAll("_", " ")}</p>
          ))}
        </div>
      ),
    },
    {
      title: "Amount",
      width: 175,
      render: (_, row) => (
        <div className="flex gap-2">
          <InputNumber
            value={Number(row.amount)}
            min={0.01}
            precision={2}
            disabled={!editable}
            aria-label={`Amount for ${row.description}`}
            className="min-w-0 flex-1"
            onChange={(value) => {
              if (typeof value === "number") patchRow(row.id, { amount: value });
            }}
          />
          <Input
            value={row.currency}
            maxLength={3}
            disabled={!editable}
            aria-label={`Currency for ${row.description}`}
            className="!w-16 uppercase"
            onChange={(event) => patchRow(row.id, { currency: event.target.value.toUpperCase() })}
          />
        </div>
      ),
    },
    {
      title: "Category",
      width: 190,
      render: (_, row) => (
        <Select
          allowClear
          value={row.categoryId ?? undefined}
          disabled={!editable || row.decision !== "INCLUDE_EXPENSE"}
          placeholder="Select category"
          aria-label={`Category for ${row.description}`}
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
      title: "Credit card",
      width: 220,
      render: (_, row) => (
        <Select
          allowClear
          value={row.linkedCreditCardId ?? undefined}
          disabled={!editable || row.decision !== "INCLUDE_EXPENSE"}
          placeholder={statementImport?.creditCard ? `Use ${statementImport.creditCard.name}` : "Select card"}
          aria-label={`Credit card for ${row.description}`}
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
      title: "Decision",
      width: 190,
      fixed: "right",
      render: (_, row) => (
        <Select
          value={row.decision}
          disabled={!editable}
          aria-label={`Review decision for ${row.description}`}
          className="w-full"
          options={DECISION_OPTIONS.map((option) => ({
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
          <p role="alert" className="text-sm text-[var(--rose)]">{error ?? "Statement import not found."}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => router.push("/finance/statements")}>Back to statements</Button>
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
            ← Back to statements
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">
              {statementImport.sourceFileName || "Statement review"}
            </h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Version {statementImport.version} · Uploaded {dayjs(statementImport.createdAt).format("MMM D, YYYY h:mm A")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {editable && (
            <>
              <Button type="button" variant="outline" loading={saving} disabled={changedRows.length === 0} onClick={() => void saveRows()}>
                Save review
              </Button>
              <Button type="button" variant="success" disabled={!canConfirm} onClick={() => setConfirmOpen(true)}>
                Confirm expenses
              </Button>
            </>
          )}
          {statementImport.status === "CONFIRMED" && (
            <Button type="button" variant="danger" onClick={() => setRevertOpen(true)}>
              Revert import
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => void load()} disabled={loading}>
            Reload
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
          Credit cards could not be loaded. Rows can still inherit the card selected during upload.
        </div>
      )}
      {statementImport.failureMessage && (
        <div role="alert" className="mb-4 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]">
          {statementImport.failureMessage}
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Reconciliation" className="!p-5 lg:col-span-2">
          {statementImport.reconciliation ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div><p className="text-xs text-[var(--text-3)]">Opening balance</p><p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(statementImport.reconciliation.openingBalance, "MXN")}</p></div>
              <div><p className="text-xs text-[var(--text-3)]">Charges</p><p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(statementImport.reconciliation.chargesTotal, "MXN")}</p></div>
              <div><p className="text-xs text-[var(--text-3)]">Payments</p><p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(statementImport.reconciliation.paymentsTotal, "MXN")}</p></div>
              <div><p className="text-xs text-[var(--text-3)]">Credits</p><p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(statementImport.reconciliation.creditsTotal, "MXN")}</p></div>
              <div><p className="text-xs text-[var(--text-3)]">Closing balance</p><p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(statementImport.reconciliation.closingBalance, "MXN")}</p></div>
              <div><p className="text-xs text-[var(--text-3)]">Difference</p><p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(statementImport.reconciliation.difference, "MXN")}</p></div>
              <div className="sm:col-span-3">
                <Badge variant={reconciliationPassed ? "success" : "danger"}>{statementImport.reconciliation.status}</Badge>
                {statementImport.reconciliation.message && <span className="ml-2 text-xs text-[var(--text-3)]">{statementImport.reconciliation.message}</span>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-3)]">Reconciliation data is not available.</p>
          )}
        </Card>

        <Card title="Review readiness" className="!p-5">
          <div className="space-y-2 text-sm text-[var(--text-2)]">
            <p>{rows.length} source rows</p>
            <p>{includedRows.length} expenses selected</p>
            <p>{pendingCount} pending decisions</p>
            <p>{statementImport.warningCount} parser warnings</p>
          </div>
          {editable && blockers.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-[var(--gold-text)]">
              {blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
            </ul>
          )}
        </Card>
      </div>

      {statementImport.paymentTargets.length > 0 && (
        <Card title="Payment targets" className="mb-4 !p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statementImport.paymentTargets.map((target) => (
              <div key={target.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/40 p-3">
                <p className="text-xs text-[var(--text-3)]">{target.label}</p>
                <p className="mt-1 font-mono text-[var(--text-1)]">{formatMoney(target.amount, target.currency)}</p>
                {target.dueDate && <p className="mt-1 text-xs text-[var(--text-3)]">Due {dayjs(target.dueDate).format("MMM D, YYYY")}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Statement rows" className="!p-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-3)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--emerald)]" aria-hidden="true" />
            Ready to confirm
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--gold)]" aria-hidden="true" />
            Pending decision
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--rose)]" aria-hidden="true" />
            Missing required data
          </span>
        </div>
        <Table<StatementRow>
          rowKey="id"
          dataSource={rows}
          columns={columns}
          pagination={false}
          scroll={{ x: 1240 }}
          size="middle"
          onRow={(row) => ({
            style: { backgroundColor: rowTint(row, hasDefaultCard) },
          })}
        />
      </Card>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmImport}
        title="Create reviewed expenses?"
        description={`This will create ${includedRows.length} expense${includedRows.length === 1 ? "" : "s"} and remove the stored PDF after confirmation.`}
        confirmLabel="Confirm expenses"
        confirmingLabel="Confirming…"
        confirmVariant="success"
        loading={confirming}
      />

      <ConfirmModal
        open={revertOpen}
        onClose={() => setRevertOpen(false)}
        onConfirm={revertImport}
        title="Revert imported expenses?"
        description="This removes only expenses created by this statement import. The reviewed statement record remains available."
        confirmLabel="Revert import"
        confirmingLabel="Reverting…"
        loading={reverting}
      />
    </div>
  );
}
