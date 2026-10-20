"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCardPaymentAlerts } from "../cardPaymentAlerts";
import { CREDIT_CARDS_CHANGED_EVENT } from "../creditCardsEvents";
import type { CardPaymentAlert } from "../credit-cards.types";
import { useFinanceContext } from "../FinanceContext";

export function useCardPaymentAlerts() {
  const [alerts, setAlerts] = useState<CardPaymentAlert[]>([]);
  const { sharedOverview, sharedOverviewLoading } = useFinanceContext();

  // Derive alerts from context overview data.
  useEffect(() => {
    let active = true;
    const derive = () => {
      if (!active) return;
      const derived = buildCardPaymentAlerts(sharedOverview?.cards ?? []);
      setAlerts(derived);
    };

    derive();

    const onRefresh = () => { void derive(); };
    const onVisible = () => { if (document.visibilityState === "visible") onRefresh(); };

    window.addEventListener(CREDIT_CARDS_CHANGED_EVENT, onRefresh);
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener(CREDIT_CARDS_CHANGED_EVENT, onRefresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sharedOverview]);

  // Derive status from alerts + loading — no effect needed.
  const status = useMemo<"loading" | "ready" | "error">(() => {
    if (sharedOverviewLoading) return "loading";
    if (alerts.length > 0) return "ready";
    return "error";
  }, [sharedOverviewLoading, alerts.length]);

  return { alerts, status };
}
