"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getCreditCardsAction } from "@/lib/userActions";
import type { CreditCardSummary } from "./statement-import.types";

interface FinanceContextValue {
  /** Active card count for sidebar badges. */
  activeCardCount: number | null;
  /** Shared credit cards list — avoids duplicate fetches in child views. */
  sharedCards: CreditCardSummary[];
  /** Whether the shared cards are still loading. */
  sharedCardsLoading: boolean;
}

const FinanceContext = createContext<FinanceContextValue>({
  activeCardCount: null,
  sharedCards: [],
  sharedCardsLoading: true,
});

export function useFinanceContext(): FinanceContextValue {
  return useContext(FinanceContext);
}

function initializeCards(): { cards: CreditCardSummary[]; loading: boolean } {
  return { cards: [], loading: true };
}

/** Provider that fetches credit cards once and shares the result with all children. */
export function FinanceProvider({ children }: { children: ReactNode }) {
  const [{ cards: sharedCards, loading: sharedCardsLoading }, setData] = useState(initializeCards);
  const [activeCardCount, setActiveCardCount] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await getCreditCardsAction();
      if (result.error || !result.data) return;
      const cards = result.data;
      setData({ cards, loading: false });
      setActiveCardCount(cards.filter((c) => c.isActive).length);
    } catch {
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const onRefresh = () => { if (!cancelled) void refresh(); };
    // Fetch on mount — standard pattern, consistent with other hooks in this module.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    window.addEventListener("CREDIT_CARDS_CHANGED", onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("CREDIT_CARDS_CHANGED", onRefresh);
    };
  }, [refresh]);

  return (
    <FinanceContext.Provider value={{ activeCardCount, sharedCards, sharedCardsLoading }}>
      {children}
    </FinanceContext.Provider>
  );
}
