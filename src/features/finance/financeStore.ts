import { createInflightDeduper } from "@/lib/inflight";
import { CREDIT_CARDS_CHANGED_EVENT } from "./creditCardsEvents";
import type { CreditCardOverviewResponse } from "./credit-cards.types";
import type { CreditCardSummary } from "./statement-import.types";
import type { Subscription } from "./subscriptions.types";

type FetchResult<T> = { data?: T; error?: string; sessionExpired?: boolean };

export type FinanceSnapshot = {
  /** Overview (includeInactive=true): the single source for cards, KPIs and payment alerts. */
  overview: CreditCardOverviewResponse | undefined;
  overviewLoading: boolean;
  /** Cards derived from the overview, so no separate cards-list request exists. */
  cards: CreditCardSummary[];
  /** Active card count for the sidebar; null until the first overview arrives. */
  activeCardCount: number | null;
  subscriptions: Subscription[];
  subscriptionsLoading: boolean;
  /** Pending purchase count for the sidebar; published by usePendingPurchases. */
  pendingCount: number | undefined;
};

type StoreDeps = {
  fetchOverview: () => Promise<FetchResult<CreditCardOverviewResponse>>;
  fetchSubscriptions: () => Promise<FetchResult<Subscription[]>>;
  eventTarget?: EventTarget;
  dedupe?: ReturnType<typeof createInflightDeduper>;
};

const EMPTY_CARDS: CreditCardSummary[] = [];

/**
 * Framework-free data store behind FinanceProvider. One request per endpoint:
 * concurrent refreshes (StrictMode double effects, bursts of
 * CREDIT_CARDS_CHANGED) share a single in-flight promise.
 */
export function createFinanceStore({ fetchOverview, fetchSubscriptions, eventTarget, dedupe = createInflightDeduper() }: StoreDeps) {
  let snapshot: FinanceSnapshot = {
    overview: undefined,
    overviewLoading: true,
    cards: EMPTY_CARDS,
    activeCardCount: null,
    subscriptions: [],
    subscriptionsLoading: true,
    pendingCount: undefined,
  };
  const listeners = new Set<() => void>();

  const update = (patch: Partial<FinanceSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };

  const refreshOverview = () =>
    dedupe("overview", async () => {
      try {
        const result = await fetchOverview();
        if (result.error || !result.data) {
          update({ overviewLoading: false });
          return;
        }
        const cards = result.data.cards as unknown as CreditCardSummary[];
        update({
          overview: result.data,
          overviewLoading: false,
          cards,
          activeCardCount: cards.filter((card) => card.isActive).length,
        });
      } catch {
        update({ overviewLoading: false });
      }
    });

  const refreshSubscriptions = () =>
    dedupe("subscriptions", async () => {
      try {
        const result = await fetchSubscriptions();
        if (result.error || !result.data) {
          update({ subscriptionsLoading: false });
          return;
        }
        update({ subscriptions: result.data, subscriptionsLoading: false });
      } catch {
        update({ subscriptionsLoading: false });
      }
    });

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refreshOverview,
    refreshSubscriptions,
    setPendingCount(count: number | undefined) {
      if (snapshot.pendingCount === count) return;
      update({ pendingCount: count });
    },
    /** Initial load plus the card-change listener. Safe to call twice (StrictMode). */
    start() {
      const onCardsChanged = () => void refreshOverview();
      eventTarget?.addEventListener(CREDIT_CARDS_CHANGED_EVENT, onCardsChanged);
      void refreshOverview();
      void refreshSubscriptions();
      return () => eventTarget?.removeEventListener(CREDIT_CARDS_CHANGED_EVENT, onCardsChanged);
    },
  };
}

export type FinanceStore = ReturnType<typeof createFinanceStore>;
