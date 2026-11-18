import { daysUntil, type Subscription } from "./subscriptions.types";
import { toCalendarDate } from "./finance.types";

export type SubscriptionAlert = {
  key: string;
  title: string;
  amount: number;
  currency: string;
  nextPaymentDate: string;
  daysUntil: number;
  status: "overdue" | "due-soon";
};

const ALERT_HORIZON_DAYS = 7;

/**
 * Builds "due soon"/"overdue" alerts straight from each active
 * subscription's real nextPaymentDate. No more heuristic average-interval
 * prediction now that the backend returns a real recurrence date — this is
 * an exact calendar-day computation, not an estimate.
 */
export function buildSubscriptionAlerts(
  subscriptions: Subscription[],
  today: Date = new Date(),
): SubscriptionAlert[] {
  const alerts: SubscriptionAlert[] = [];

  for (const subscription of subscriptions) {
    if (!subscription.isActive) continue;

    const remaining = daysUntil(subscription.nextPaymentDate, today);
    if (remaining > ALERT_HORIZON_DAYS) continue;

    alerts.push({
      key: subscription.id,
      title: subscription.name,
      amount: Number(subscription.cost),
      currency: subscription.currency,
      nextPaymentDate: toCalendarDate(subscription.nextPaymentDate),
      daysUntil: remaining,
      status: remaining < 0 ? "overdue" : "due-soon",
    });
  }

  return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
}

type SubscriptionAlertsResult = {
  data?: Subscription[];
  error?: string;
  sessionExpired?: boolean;
};

export type SubscriptionAlertsState = {
  status: "loading" | "ready" | "error";
  alerts: SubscriptionAlert[];
};

export async function loadSubscriptionAlerts(
  fetchSubscriptions: () => Promise<SubscriptionAlertsResult>,
  today: Date = new Date(),
): Promise<SubscriptionAlertsState> {
  try {
    const result = await fetchSubscriptions();
    if (!result.data || result.error || result.sessionExpired) {
      return { status: "error", alerts: [] };
    }
    return { status: "ready", alerts: buildSubscriptionAlerts(result.data, today) };
  } catch {
    return { status: "error", alerts: [] };
  }
}
