"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { getCreditCardsOverviewAction, getSubscriptionsAction } from "@/lib/userActions";
import { dedupeInflight } from "@/lib/inflight";
import type { CreditCardSummary } from "./statement-import.types";
import type { Subscription } from "./subscriptions.types";
import type { CreditCardOverviewResponse } from "./credit-cards.types";
import { createFinanceStore, type FinanceSnapshot, type FinanceStore } from "./financeStore";

/** Signed-in user as resolved once by the server layout (no client /me request). */
export type FinanceProfile = {
  name?: string;
  email?: string;
  currency?: string;
  isActive?: boolean;
};

interface FinanceContextValue {
  /** Signed-in user from the server layout — views must not refetch /me. */
  profile: FinanceProfile | undefined;
  /** Active card count for sidebar badges (null until the overview loads). */
  activeCardCount: number | null;
  /** Pending purchase count for the sidebar (undefined until known / on error). */
  pendingCount: number | undefined;
  /** Publish a fresh pending count (called by usePendingPurchases — no extra request). */
  setPendingCount: (count: number | undefined) => void;
  /** All cards (active and inactive), derived from the shared overview. */
  sharedCards: CreditCardSummary[];
  sharedCardsLoading: boolean;
  sharedSubscriptions: Subscription[];
  sharedSubscriptionsLoading: boolean;
  /** Shared credit cards overview (includeInactive=true). */
  sharedOverview: CreditCardOverviewResponse | undefined;
  sharedOverviewLoading: boolean;
  /** Same list as sharedCards (kept for existing callers). */
  overviewCards: CreditCardSummary[];
  /** Refetch cards + overview (one request). Mutations may call this or dispatch CREDIT_CARDS_CHANGED_EVENT once. */
  refreshCards: () => Promise<void>;
  /** Reorder cards in the shared snapshot without a refetch; returns the previous id order. */
  setCardOrder: (ids: readonly string[]) => string[];
  /** Refetch subscriptions (one request). Call after subscription mutations. */
  refreshSubscriptions: () => Promise<void>;
}

const noop = async () => {};

const FinanceContext = createContext<FinanceContextValue>({
  profile: undefined,
  activeCardCount: null,
  pendingCount: undefined,
  setPendingCount: () => {},
  sharedCards: [],
  sharedCardsLoading: true,
  sharedSubscriptions: [],
  sharedSubscriptionsLoading: true,
  sharedOverview: undefined,
  sharedOverviewLoading: true,
  overviewCards: [],
  setCardOrder: () => [],
  refreshCards: noop,
  refreshSubscriptions: noop,
});

export function useFinanceContext(): FinanceContextValue {
  return useContext(FinanceContext);
}

function createBrowserStore(): FinanceStore {
  return createFinanceStore({
    fetchOverview: () => getCreditCardsOverviewAction("includeInactive=true"),
    fetchSubscriptions: () => getSubscriptionsAction(),
    eventTarget: typeof window === "undefined" ? undefined : window,
    dedupe: dedupeInflight,
  });
}

const serverSnapshot = (store: FinanceStore): FinanceSnapshot => store.getSnapshot();

/** Fetches overview (cards) and subscriptions once and shares them with every child. */
export function FinanceProvider({ children, user }: { children: ReactNode; user?: FinanceProfile }) {
  const [store] = useState(createBrowserStore);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, () => serverSnapshot(store));

  useEffect(() => store.start(), [store]);

  const value = useMemo<FinanceContextValue>(
    () => ({
      profile: user,
      activeCardCount: snapshot.activeCardCount,
      pendingCount: snapshot.pendingCount,
      setPendingCount: store.setPendingCount,
      sharedCards: snapshot.cards,
      sharedCardsLoading: snapshot.overviewLoading,
      sharedSubscriptions: snapshot.subscriptions,
      sharedSubscriptionsLoading: snapshot.subscriptionsLoading,
      sharedOverview: snapshot.overview,
      sharedOverviewLoading: snapshot.overviewLoading,
      overviewCards: snapshot.cards,
      setCardOrder: store.setCardOrder,
      refreshCards: store.refreshOverview,
      refreshSubscriptions: store.refreshSubscriptions,
    }),
    [snapshot, store, user],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
