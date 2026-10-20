"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getCreditCardsAction, getCreditCardsOverviewAction, getSubscriptionsAction } from "@/lib/userActions";
import type { CreditCardSummary } from "./statement-import.types";
import type { Subscription } from "./subscriptions.types";
import type { CreditCardOverviewResponse } from "./credit-cards.types";

interface FinanceContextValue {
  /** Active card count for sidebar badges. */
  activeCardCount: number | null;
  /** Shared credit cards list — avoids duplicate fetches in child views. */
  sharedCards: CreditCardSummary[];
  /** Whether the shared cards are still loading. */
  sharedCardsLoading: boolean;
  /** Shared subscriptions list — avoids duplicate fetches (banner + bell). */
  sharedSubscriptions: Subscription[];
  /** Whether the shared subscriptions are still loading. */
  sharedSubscriptionsLoading: boolean;
  /** Shared credit cards overview (includeInactive=true) — avoids duplicate fetches across views. */
  sharedOverview: CreditCardOverviewResponse | undefined;
  /** Whether the shared overview is still loading. */
  sharedOverviewLoading: boolean;
  /** Flattened card list from the shared overview — for hooks that only need cards, not the full overview shape. */
  overviewCards: CreditCardSummary[];
}

const FinanceContext = createContext<FinanceContextValue>({
  activeCardCount: null,
  sharedCards: [],
  sharedCardsLoading: true,
  sharedSubscriptions: [],
  sharedSubscriptionsLoading: true,
  sharedOverview: undefined,
  sharedOverviewLoading: true,
  overviewCards: [],
});

export function useFinanceContext(): FinanceContextValue {
  return useContext(FinanceContext);
}

function initializeCards(): { cards: CreditCardSummary[]; loading: boolean } {
  return { cards: [], loading: true };
}

function initializeSubscriptions(): { subscriptions: Subscription[]; loading: boolean } {
  return { subscriptions: [], loading: true };
}

function initializeOverview(): { overview: CreditCardOverviewResponse | undefined; loading: boolean } {
  return { overview: undefined, loading: true };
}

/** Provider that fetches credit cards, subscriptions and overview once and shares the result with all children. */
export function FinanceProvider({ children }: { children: ReactNode }) {
  const [{ cards: sharedCards, loading: sharedCardsLoading }, setCards] = useState(initializeCards);
  const [activeCardCount, setActiveCardCount] = useState<number | null>(null);

  const [{ subscriptions: sharedSubscriptions, loading: sharedSubscriptionsLoading }, setSubscriptions] = useState(initializeSubscriptions);

  const [{ overview: sharedOverview, loading: sharedOverviewLoading }, setOverview] = useState(initializeOverview);

  const refreshCards = useCallback(async () => {
    try {
      const result = await getCreditCardsAction();
      if (result.error || !result.data) return;
      const cards = result.data;
      setCards({ cards, loading: false });
      setActiveCardCount(cards.filter((c) => c.isActive).length);
    } catch {
      setCards((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const refreshSubscriptions = useCallback(async () => {
    try {
      const result = await getSubscriptionsAction();
      if (result.error || !result.data) return;
      setSubscriptions({ subscriptions: result.data, loading: false });
    } catch {
      setSubscriptions((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const refreshOverview = useCallback(async () => {
    try {
      const result = await getCreditCardsOverviewAction("includeInactive=true");
      if (result.error || !result.data) return;
      setOverview({ overview: result.data, loading: false });
    } catch {
      setOverview((prev) => ({ ...prev, overview: prev.overview, loading: false }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const onRefreshCards = () => { if (!cancelled) void refreshCards(); };
    // Fetch on mount — standard pattern, consistent with other hooks in this module.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCards();
    window.addEventListener("CREDIT_CARDS_CHANGED", onRefreshCards);
    return () => {
      cancelled = true;
      window.removeEventListener("CREDIT_CARDS_CHANGED", onRefreshCards);
    };
  }, [refreshCards]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSubscriptions();
  }, [refreshSubscriptions]);

  useEffect(() => {
    let cancelled = false;
    const onRefreshOverview = () => { if (!cancelled) void refreshOverview(); };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshOverview();
    window.addEventListener("CREDIT_CARDS_CHANGED", onRefreshOverview);
    return () => {
      cancelled = true;
      window.removeEventListener("CREDIT_CARDS_CHANGED", onRefreshOverview);
    };
  }, [refreshOverview]);

  const overviewCards = useMemo(() => sharedOverview?.cards ?? [], [sharedOverview]);

  return (
    <FinanceContext.Provider value={{
      activeCardCount,
      sharedCards,
      sharedCardsLoading: sharedCardsLoading,
      sharedSubscriptions,
      sharedSubscriptionsLoading: sharedSubscriptionsLoading,
      sharedOverview,
      sharedOverviewLoading: sharedOverviewLoading,
      overviewCards,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}
