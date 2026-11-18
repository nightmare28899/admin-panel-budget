import { getCutoffPaymentState } from "./cardCutoffStatus";
import type { CreditCardOverviewItem } from "./credit-cards.types";

export type EstimatedPayable = {
  currency: string;
  /** Unpaid amount of already issued statements. */
  statementDue: number;
  /** Installments plus daily spend that will land on the next statement. */
  nextClose: number;
  total: number;
  cardCount: number;
};

const cents = (value: number) => Math.round(value * 100) / 100;

/**
 * Estimated amount the user will have to pay across active cards, per currency:
 * what issued statements still ask for, plus what the next cutoff will bill
 * (the two ranges never overlap: next-close spend starts after the last closing).
 */
export function estimatePayable(cards: CreditCardOverviewItem[], now: Date = new Date()): EstimatedPayable[] {
  const byCurrency = new Map<string, EstimatedPayable>();
  for (const card of cards) {
    if (!card.isActive) continue;
    const state = getCutoffPaymentState(card, now);
    const statementDue = state.pending ? Math.max(0, state.currentPaymentDue ?? 0) : 0;
    const nextClose = Math.max(0, card.statementSummary.nextClosePaymentEstimate ?? 0);
    if (statementDue === 0 && nextClose === 0) continue;
    const entry = byCurrency.get(card.currency)
      ?? { currency: card.currency, statementDue: 0, nextClose: 0, total: 0, cardCount: 0 };
    entry.statementDue = cents(entry.statementDue + statementDue);
    entry.nextClose = cents(entry.nextClose + nextClose);
    entry.total = cents(entry.statementDue + entry.nextClose);
    entry.cardCount += 1;
    byCurrency.set(card.currency, entry);
  }
  return [...byCurrency.values()];
}
