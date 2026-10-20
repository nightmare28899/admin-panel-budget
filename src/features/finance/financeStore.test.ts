import { describe, expect, it, vi } from "vitest";
import { createInflightDeduper } from "@/lib/inflight";
import { createFinanceStore } from "./financeStore";
import { CREDIT_CARDS_CHANGED_EVENT } from "./creditCardsEvents";
import type { CreditCardOverviewResponse } from "./credit-cards.types";
import type { Subscription } from "./subscriptions.types";

const card = (id: string, isActive: boolean) => ({ id, isActive }) as unknown as CreditCardOverviewResponse["cards"][number];
const overview = (...cards: ReturnType<typeof card>[]) =>
  ({ referenceDate: "2026-01-01", portfolio: {}, cards }) as unknown as CreditCardOverviewResponse;

function setup() {
  const target = new EventTarget();
  const fetchOverview = vi.fn(async () => ({ data: overview(card("a", true), card("b", false), card("c", true)) }));
  const fetchSubscriptions = vi.fn(async () => ({ data: [{ id: "s1" }] as unknown as Subscription[] }));
  const store = createFinanceStore({
    fetchOverview,
    fetchSubscriptions,
    eventTarget: target,
    dedupe: createInflightDeduper(),
  });
  return { target, fetchOverview, fetchSubscriptions, store };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("financeStore", () => {
  it("fetches overview and subscriptions exactly once on start and derives cards", async () => {
    const { store, fetchOverview, fetchSubscriptions } = setup();
    store.start();
    await flush();
    expect(fetchOverview).toHaveBeenCalledTimes(1);
    expect(fetchSubscriptions).toHaveBeenCalledTimes(1);
    const s = store.getSnapshot();
    expect(s.cards.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(s.activeCardCount).toBe(2);
    expect(s.overviewLoading).toBe(false);
    expect(s.subscriptions).toHaveLength(1);
    expect(s.subscriptionsLoading).toBe(false);
  });

  it("collapses a StrictMode start/stop/start into one request per endpoint", async () => {
    const { store, fetchOverview, fetchSubscriptions } = setup();
    const stop = store.start();
    stop();
    store.start();
    await flush();
    expect(fetchOverview).toHaveBeenCalledTimes(1);
    expect(fetchSubscriptions).toHaveBeenCalledTimes(1);
  });

  it("one CREDIT_CARDS_CHANGED_EVENT triggers exactly one overview refetch and no subscriptions refetch", async () => {
    const { store, target, fetchOverview, fetchSubscriptions } = setup();
    store.start();
    await flush();
    target.dispatchEvent(new Event(CREDIT_CARDS_CHANGED_EVENT));
    await flush();
    expect(fetchOverview).toHaveBeenCalledTimes(2);
    expect(fetchSubscriptions).toHaveBeenCalledTimes(1);
  });

  it("burst events while a refetch is in flight share one request", async () => {
    const { store, target, fetchOverview } = setup();
    store.start();
    await flush();
    target.dispatchEvent(new Event(CREDIT_CARDS_CHANGED_EVENT));
    target.dispatchEvent(new Event(CREDIT_CARDS_CHANGED_EVENT));
    await flush();
    expect(fetchOverview).toHaveBeenCalledTimes(2);
  });

  it("stops listening after stop()", async () => {
    const { store, target, fetchOverview } = setup();
    const stop = store.start();
    await flush();
    stop();
    target.dispatchEvent(new Event(CREDIT_CARDS_CHANGED_EVENT));
    await flush();
    expect(fetchOverview).toHaveBeenCalledTimes(1);
  });

  it("stops loading and keeps previous data when a refetch fails", async () => {
    const { store, target, fetchOverview } = setup();
    store.start();
    await flush();
    fetchOverview.mockResolvedValueOnce({ error: "boom" } as never);
    target.dispatchEvent(new Event(CREDIT_CARDS_CHANGED_EVENT));
    await flush();
    expect(store.getSnapshot().cards).toHaveLength(3);
    expect(store.getSnapshot().overviewLoading).toBe(false);
  });

  it("finishes loading when the very first request errors", async () => {
    const { store, fetchOverview } = setup();
    fetchOverview.mockResolvedValueOnce({ error: "boom" } as never);
    store.start();
    await flush();
    expect(store.getSnapshot().overviewLoading).toBe(false);
    expect(store.getSnapshot().activeCardCount).toBeNull();
  });

  it("finishes loading when a request throws", async () => {
    const { store, fetchSubscriptions } = setup();
    fetchSubscriptions.mockRejectedValueOnce(new Error("net"));
    store.start();
    await flush();
    expect(store.getSnapshot().subscriptionsLoading).toBe(false);
  });

  it("refreshSubscriptions refetches only subscriptions", async () => {
    const { store, fetchOverview, fetchSubscriptions } = setup();
    store.start();
    await flush();
    await store.refreshSubscriptions();
    expect(fetchSubscriptions).toHaveBeenCalledTimes(2);
    expect(fetchOverview).toHaveBeenCalledTimes(1);
  });

  it("setPendingCount updates the snapshot and notifies subscribers once, ignoring no-ops", () => {
    const { store } = setup();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setPendingCount(3);
    store.setPendingCount(3);
    expect(store.getSnapshot().pendingCount).toBe(3);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps snapshot identity stable when nothing changed", async () => {
    const { store } = setup();
    store.start();
    await flush();
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });
});
