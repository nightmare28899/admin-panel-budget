import { useMemo } from "react";
import type { CreditCardSummary } from "../statement-import.types";
import { useFinanceContext } from "../FinanceContext";

/** The user's active credit cards — uses shared context to avoid duplicate fetches. */
export function useCreditCards() {
  const shared = useFinanceContext();

  const cards = useMemo<CreditCardSummary[]>(
    () => shared.sharedCards,
    [shared.sharedCards],
  );

  return {
    cards,
    cardsError: undefined,
    loading: shared.sharedCardsLoading,
  };
}
