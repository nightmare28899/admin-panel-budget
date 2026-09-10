"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExpenseForm } from "./ExpenseForm";
import type { Category, Expense, ExpenseWritePayload } from "./finance.types";
import { formatCalendarDate } from "./finance.types";
import {
  deleteExpenseAction,
  getCategoriesAction,
  getExpensesAction,
  getUserMeAction,
  updateExpenseAction,
} from "@/lib/userActions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ListSkeleton } from "@/components/ui/ContentSkeleton";
import { Modal } from "@/components/ui/Modal";
import { SUBSCRIPTION_CATEGORY_NAME, groupSubscriptions } from "./subscriptionUtils";

export function SubscriptionsView() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState<string>();
  const [editing, setEditing] = useState<Expense>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<Expense>();

  const reload = useCallback(async () => {
    setLoading(true);
    const profile = await getUserMeAction();

    if (profile.error || !profile.data?.user?.isActive) {
      router.push("/user-login");
      return;
    }

    const cats = await getCategoriesAction();
    if (cats.error) {
      setError(cats.error);
      setLoading(false);
      return;
    }
    setCategories(cats.data ?? []);

    const subscriptionCategory = (cats.data ?? []).find(
      (category) => category.name === SUBSCRIPTION_CATEGORY_NAME,
    );

    if (!subscriptionCategory) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({
      page: "1",
      limit: "100",
      categoryId: subscriptionCategory.id,
    });
    const result = await getExpensesAction(params.toString());
    if (result.error) setError(result.error);
    else setExpenses(result.data?.expenses ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const refreshAfter = async (result: { error?: string }) => {
    if (result.error) setError(result.error);
    else void reload();
  };

  const saveExpense = async (values: ExpenseWritePayload) => {
    if (!editing) return;
    setSaving(true);
    const result = await updateExpenseAction(editing.id, values);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(undefined);
    void reload();
  };

  const deleteCharge = async () => {
    if (!confirmingDelete) return;

    setDeleting(true);
    await refreshAfter(await deleteExpenseAction(confirmingDelete.id));
    setDeleting(false);
    setConfirmingDelete(undefined);
  };

  const groups = groupSubscriptions(expenses);
  const subscriptionCategory = categories.find(
    (category) => category.name === SUBSCRIPTION_CATEGORY_NAME,
  );

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">
          Your subscriptions
        </h1>
        <p className="mt-0.5 text-sm text-[var(--text-3)]">
          Every distinct recurring charge tagged &ldquo;{SUBSCRIPTION_CATEGORY_NAME}&rdquo;, grouped
          from your expense history.
        </p>
      </div>

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

      <Card className="!p-4">
        {loading ? (
          <ListSkeleton />
        ) : !subscriptionCategory ? (
          <p className="py-6 text-center text-sm text-[var(--text-3)]">
            No &ldquo;{SUBSCRIPTION_CATEGORY_NAME}&rdquo; category exists yet — create it on the
            Categories page, then tag your recurring expenses with it to see them here.
          </p>
        ) : groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-3)]">
            No expenses are tagged &ldquo;{SUBSCRIPTION_CATEGORY_NAME}&rdquo; yet.
          </p>
        ) : (
          <ul>
            {groups.map((group) => {
              const isOpen = expanded === group.key;
              return (
                <li
                  key={group.key}
                  className="border-b border-[var(--border-soft)] py-4 last:border-b-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true">{group.category?.icon ?? "🔁"}</span>
                      <h3 className="font-medium text-[var(--text-1)]">{group.title}</h3>
                      <Badge variant="neutral">
                        {group.charges.length}× charged
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-mono text-sm tabular-nums text-[var(--text-1)]">
                          {group.latest.currency} {Number(group.latest.cost).toFixed(2)}
                        </span>
                        {group.amountVaries && (
                          <span className="ml-1 text-xs text-[var(--text-3)]">varies</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExpanded((current) =>
                            current === group.key ? undefined : group.key,
                          )
                        }
                        aria-expanded={isOpen}
                      >
                        {isOpen ? "Hide charges" : "Manage"}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-3)]">
                    Last charge: {formatCalendarDate(group.latest.date)}
                  </p>

                  {isOpen && (
                    <ul className="mt-3 space-y-1.5 border-l border-[var(--border-soft)] pl-4">
                      {group.charges.map((charge) => (
                        <li
                          key={charge.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--bg-3)]/40 px-3 py-2"
                        >
                          <div className="flex items-baseline gap-2 text-sm">
                            <span className="text-[var(--text-3)]">
                              {formatCalendarDate(charge.date)}
                            </span>
                            <span className="font-mono tabular-nums text-[var(--text-1)]">
                              {charge.currency} {Number(charge.cost).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditing(charge)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => setConfirmingDelete(charge)}
                            >
                              Delete
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(undefined)}
        title="Edit charge"
        maxWidth="max-w-xl"
      >
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          {editing && (
            <ExpenseForm
              categories={categories}
              expense={editing}
              loading={saving}
              onSubmit={saveExpense}
              onCancel={() => setEditing(undefined)}
            />
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(confirmingDelete)}
        onClose={() => setConfirmingDelete(undefined)}
        onConfirm={deleteCharge}
        title="Delete subscription charge?"
        description={
          confirmingDelete
            ? `This will permanently delete “${confirmingDelete.title}” from ${formatCalendarDate(confirmingDelete.date)}. This action cannot be undone.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete charge"
        confirmingLabel="Deleting…"
        loading={deleting}
      />
    </div>
  );
}
