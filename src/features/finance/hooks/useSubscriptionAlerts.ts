import { useMemo } from "react";
import { buildSubscriptionAlerts, type SubscriptionAlertsState } from "../subscriptionAlerts";
import { useFinanceContext } from "../FinanceContext";

/** Derives subscription alerts from the shared context data — zero extra fetches. */
export function useSubscriptionAlerts(): SubscriptionAlertsState {
  const { sharedSubscriptions, sharedSubscriptionsLoading } = useFinanceContext();

  return useMemo<SubscriptionAlertsState>(() => {
    if (sharedSubscriptionsLoading) {
      return { status: "loading", alerts: [] };
    }
    const alerts = buildSubscriptionAlerts(sharedSubscriptions);
    return {
      status: "ready",
      alerts,
    };
  }, [sharedSubscriptions, sharedSubscriptionsLoading]);
}
