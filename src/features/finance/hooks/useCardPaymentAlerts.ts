"use client";

import { useEffect, useState } from "react";
import { getCreditCardsOverviewAction } from "@/lib/userActions";
import { buildCardPaymentAlerts } from "../cardPaymentAlerts";
import { CREDIT_CARDS_CHANGED_EVENT } from "../creditCardsEvents";
import type { CardPaymentAlert } from "../credit-cards.types";

export function useCardPaymentAlerts() {
  const [alerts, setAlerts] = useState<CardPaymentAlert[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    let request = 0;
    const refresh = async () => {
      const current = ++request;
      try {
        const result = await getCreditCardsOverviewAction("");
        if (!active || current !== request) return;
        if (!result.data || result.error || result.sessionExpired) {
          setAlerts([]);
          setStatus("error");
          return;
        }
        setAlerts(buildCardPaymentAlerts(result.data.cards));
        setStatus("ready");
      } catch {
        if (active && current === request) {
          setAlerts([]);
          setStatus("error");
        }
      }
    };
    const onRefresh = () => { void refresh(); };
    const onVisible = () => { if (document.visibilityState === "visible") onRefresh(); };
    void refresh();
    const timer = window.setInterval(onRefresh, 60_000);
    window.addEventListener(CREDIT_CARDS_CHANGED_EVENT, onRefresh);
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(CREDIT_CARDS_CHANGED_EVENT, onRefresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return { alerts, status };
}
