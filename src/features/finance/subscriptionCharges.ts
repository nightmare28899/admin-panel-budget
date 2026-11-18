import type { Expense } from "./finance.types";
import { getExpensesAction } from "@/lib/userActions";

export type ChargeGroup = {
  key: string;
  displayName: string;
  charges: Expense[];
};

export async function fetchAllExpensesForCategory(categoryId: string): Promise<{ expenses: Expense[]; error?: string }> {
  const collected: Expense[] = [];
  let page = 1;
  // Safety cap: guards against ever looping on unexpected data.
  for (let i = 0; i < 20; i += 1) {
    const params = new URLSearchParams({ page: String(page), limit: "100", categoryId });
    const result = await getExpensesAction(params.toString());
    if (result.error) return { expenses: collected, error: result.error };
    collected.push(...(result.data?.expenses ?? []));
    if (!result.data?.pagination.hasNext) break;
    page += 1;
  }
  return { expenses: collected };
}

export function groupCharges(expenses: Expense[]): ChargeGroup[] {
  const groups = new Map<string, ChargeGroup>();

  for (const expense of expenses) {
    const displayName = expense.merchantName?.trim() || expense.title;
    const key = displayName.toLocaleLowerCase();
    const existing = groups.get(key);
    if (existing) existing.charges.push(expense);
    else groups.set(key, { key, displayName, charges: [expense] });
  }

  for (const group of groups.values()) {
    group.charges.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

  return [...groups.values()].sort((a, b) => (a.charges[0].date < b.charges[0].date ? 1 : -1));
}
