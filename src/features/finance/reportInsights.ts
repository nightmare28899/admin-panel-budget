import type { Category, Expense } from "./finance.types";

export type CategoryTotal = {
  /** Category id, or null for expenses without a category. */
  id: string | null;
  category: Category | null;
  total: number;
  count: number;
};

function costOf(expense: Expense) {
  const cost = typeof expense.cost === "string" ? Number(expense.cost) : expense.cost;
  return Number.isFinite(cost) ? cost : null;
}

/** Totals and operation counts per category for one currency, highest spend first. */
export function aggregateCategories(
  expenses: Expense[],
  currency: string | null,
): CategoryTotal[] {
  if (!currency) return [];
  const byKey = new Map<string, CategoryTotal>();
  for (const expense of expenses) {
    if (expense.currency !== currency) continue;
    const cost = costOf(expense);
    if (cost === null) continue;
    const category = expense.category ?? null;
    const id = category?.id ?? expense.categoryId ?? null;
    const key = id ?? "none";
    const entry = byKey.get(key) ?? { id, category, total: 0, count: 0 };
    entry.total += cost;
    entry.count += 1;
    if (!entry.category && category) entry.category = category;
    byKey.set(key, entry);
  }
  return Array.from(byKey.values()).sort((a, b) => b.total - a.total);
}
