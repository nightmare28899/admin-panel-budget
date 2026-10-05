"use client";

import { useState } from "react";
import { DownOutlined } from "@ant-design/icons";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { InstallmentPlanBadge } from "./InstallmentPlanBadge";
import { ExpenseForm } from "./ExpenseForm";
import type { Category, Expense, ExpenseWritePayload } from "./finance.types";
import { toCalendarDate } from "./finance.types";
import type { ChargeGroup } from "./subscriptionCharges";
import { deleteExpenseAction, updateExpenseAction } from "@/lib/userActions";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";

// Shared by both a matched subscription row (inline) and a standalone
// leftover charge group (no subscription plan) — same edit/delete/expand
// behavior either way, just different surrounding chrome.
export function ChargeGroupDetail({
  group,
  categories,
  variant = "standalone",
  onChanged,
  onConvert,
}: {
  group: ChargeGroup;
  categories: Category[];
  variant?: "inline" | "standalone";
  onChanged: () => void;
  /** Only rendered for the "standalone" variant — opens the "create subscription" flow pre-filled from this group. */
  onConvert?: () => void;
}) {
  const { t, formatDate, formatNumber } = useLocale();
  const displayDate = (value: string) => {
    const calendarDate = toCalendarDate(value);
    return calendarDate ? formatDate(`${calendarDate}T12:00:00`, { dateStyle: "medium" }) : "—";
  };

  const [expanded, setExpanded] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Expense>();
  const [savingCharge, setSavingCharge] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<Expense>();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  const amounts = new Set(group.charges.map((charge) => `${Number(charge.cost)}|${charge.currency}`));
  const amountLabel =
    amounts.size === 1
      ? `${group.charges[0].currency} ${formatNumber(Number(group.charges[0].cost), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : t("varies");

  const saveCharge = async (values: ExpenseWritePayload) => {
    if (!editingCharge) return;
    setSavingCharge(true);
    setFormError(undefined);
    const result = await updateExpenseAction(editingCharge.id, values);
    setSavingCharge(false);
    if (result.error) {
      setFormError(frontendError(result.error, t, "requestFailedGeneric"));
      return;
    }
    setEditingCharge(undefined);
    onChanged();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteExpenseAction(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      setError(frontendError(result.error, t, "requestFailedGeneric"));
      setDeleteTarget(undefined);
      return;
    }
    setDeleteTarget(undefined);
    onChanged();
  };

  return (
    <div className={variant === "standalone" ? "rounded-xl border border-[var(--border-soft)] bg-[var(--bg-3)]/40 p-3" : ""}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? t("hideCharges") : t("manage")}
        onClick={() => setExpanded((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded((current) => !current);
          }
        }}
        className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
      >
        <div className="min-w-0">
          {variant === "standalone" && (
            <p className="truncate text-sm font-medium text-[var(--text-1)]">{group.displayName}</p>
          )}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--text-3)]">
            <span>{t("chargedCount", { count: formatNumber(group.charges.length) })}</span>
            <span>·</span>
            <span>{t("lastCharge", { date: displayDate(group.charges[0].date) })}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-sm text-[var(--text-1)]">{amountLabel}</span>
          <DownOutlined
            className={`text-xs text-[var(--text-3)] transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {variant === "standalone" && onConvert && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--gold)]/25 bg-[var(--gold-dim)] px-3 py-2">
          <p className="text-xs text-[var(--gold-text)]">{t("recurringChargeNoPlanHelp")}</p>
          <Button type="button" variant="tinted" size="sm" onClick={onConvert}>
            {t("convertToSubscription")}
          </Button>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-2 rounded-lg border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-3 py-2 text-xs text-[var(--rose)]">
          {error}
        </div>
      )}

      {expanded && (
        <ul className="mt-3 space-y-1.5 border-t border-[var(--border-soft)] pt-3">
          {group.charges.map((charge) => (
            <li
              key={charge.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--bg-2)]/60 px-3 py-2 text-xs"
            >
              <span className="text-[var(--text-3)]">{displayDate(charge.date)}</span>
              <span className="min-w-0 flex-1 truncate text-[var(--text-2)]">{charge.title}</span>
              <InstallmentPlanBadge expense={charge} />
              <span className="font-mono text-[var(--text-1)]">
                {charge.currency} {formatNumber(Number(charge.cost), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="flex gap-1.5">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingCharge(charge)}>
                  {t("editCharge")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteTarget(charge)}>
                  {t("deleteCharge")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(editingCharge)} onClose={() => setEditingCharge(undefined)} title={t("editCharge")} maxWidth="max-w-xl">
        {editingCharge && (
          <div className="max-h-[75vh] overflow-y-auto pr-1">
            {formError && (
              <div role="alert" className="mb-4 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]">
                {formError}
              </div>
            )}
            <ExpenseForm
              categories={categories}
              expense={editingCharge}
              loading={savingCharge}
              onSubmit={(values) => void saveCharge(values)}
              onCancel={() => setEditingCharge(undefined)}
            />
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={confirmDelete}
        title={t("deleteChargeQuestion")}
        description={
          deleteTarget
            ? t("deleteChargeDescription", { title: deleteTarget.title, date: displayDate(deleteTarget.date) })
            : t("cannotUndo")
        }
        confirmLabel={t("deleteCharge")}
        confirmingLabel={t("deleting")}
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
