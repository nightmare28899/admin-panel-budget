import type { Category, Expense } from "./finance.types";
import { toCalendarDate } from "./finance.types";
import { getCategoriesAction, getExpensesAction } from "@/lib/userActions";

export const SUBSCRIPTION_CATEGORY_NAME = "Suscripción";

export type SubscriptionGroup = {
  key: string;
  title: string;
  category?: Category | null;
  charges: Expense[];
  latest: Expense;
  amountVaries: boolean;
};

export function groupSubscriptions(expenses: Expense[]): SubscriptionGroup[] {
  const byTitle = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const key = expense.title.trim().toLowerCase();
    const bucket = byTitle.get(key);
    if (bucket) bucket.push(expense);
    else byTitle.set(key, [expense]);
  }

  const groups: SubscriptionGroup[] = [];
  for (const [key, charges] of byTitle) {
    const sorted = [...charges].sort((a, b) => (a.date < b.date ? 1 : -1));
    const latest = sorted[0];
    const amounts = new Set(charges.map((charge) => String(charge.cost)));
    groups.push({
      key,
      title: latest.title,
      category: latest.category,
      charges: sorted,
      latest,
      amountVaries: amounts.size > 1,
    });
  }

  return groups.sort((a, b) => (a.latest.date < b.latest.date ? 1 : -1));
}

export async function fetchSubscriptionGroups(): Promise<{
  groups: SubscriptionGroup[];
  error?: string;
}> {
  const cats = await getCategoriesAction();
  if (cats.error) return { groups: [], error: cats.error };

  const subscriptionCategory = (cats.data ?? []).find(
    (category) => category.name === SUBSCRIPTION_CATEGORY_NAME,
  );
  if (!subscriptionCategory) return { groups: [] };

  const params = new URLSearchParams({
    page: "1",
    limit: "100",
    categoryId: subscriptionCategory.id,
  });
  const result = await getExpensesAction(params.toString());
  if (result.error) return { groups: [], error: result.error };

  return { groups: groupSubscriptions(result.data?.expenses ?? []) };
}

export type SubscriptionAlert = {
  key: string;
  title: string;
  amount: number;
  currency: string;
  predictedDate: string;
  daysUntil: number;
  status: "overdue" | "due-soon";
};

const DAY_MS = 86_400_000;
const ALERT_HORIZON_DAYS = 7;

function parseCalendarDate(value: string): Date {
  const calendarDate = toCalendarDate(value);
  return new Date(`${calendarDate}T00:00:00`);
}

/**
 * Estimates each subscription's next charge from the average gap between its
 * past charges. Heuristic only (no recurrence data exists in the backend) —
 * skips anything with fewer than 2 charges and anything predicted more than
 * ALERT_HORIZON_DAYS out, so this stays a short, actionable list.
 */
export function predictSubscriptionAlerts(
  groups: SubscriptionGroup[],
  today: Date = new Date(),
): SubscriptionAlert[] {
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const alerts: SubscriptionAlert[] = [];

  for (const group of groups) {
    if (group.charges.length < 2) continue;

    const datesAsc = [...group.charges]
      .map((charge) => parseCalendarDate(charge.date))
      .sort((a, b) => a.getTime() - b.getTime());

    let totalGapDays = 0;
    for (let i = 1; i < datesAsc.length; i++) {
      totalGapDays += (datesAsc[i].getTime() - datesAsc[i - 1].getTime()) / DAY_MS;
    }
    const avgIntervalDays = totalGapDays / (datesAsc.length - 1);
    if (!Number.isFinite(avgIntervalDays) || avgIntervalDays <= 0) continue;

    const mostRecent = datesAsc[datesAsc.length - 1];
    const predicted = new Date(mostRecent.getTime() + avgIntervalDays * DAY_MS);
    const daysUntil = Math.round((predicted.getTime() - todayMidnight.getTime()) / DAY_MS);
    if (daysUntil > ALERT_HORIZON_DAYS) continue;

    alerts.push({
      key: group.key,
      title: group.title,
      amount: Number(group.latest.cost),
      currency: group.latest.currency,
      predictedDate: predicted.toISOString().slice(0, 10),
      daysUntil,
      status: daysUntil < 0 ? "overdue" : "due-soon",
    });
  }

  return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
}
