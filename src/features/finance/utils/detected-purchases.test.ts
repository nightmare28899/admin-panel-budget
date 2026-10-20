import { describe, expect, it, vi } from "vitest";
import { cardPaymentErrorKey, createPurchaseMutationGuard, defaultPaymentCardId, detectedPurchaseExpense, detectedPurchasePaymentDefaults, looksLikeCardPayment, paymentDateToIso, pendingPurchaseQuery } from "./detected-purchases";
import type { DetectedPurchase } from "../interfaces/detected-purchases";

const purchase: DetectedPurchase = {
  id: "purchase-id", fingerprint: "fingerprint", sourcePackage: "com.bank.app",
  amountCents: 12345, currency: "MXN", merchant: "Market",
  occurredAtMillis: new Date(2026, 9, 18, 18).getTime(), confidence: "HIGH",
  possibleDuplicateOf: null, mayBeRegistered: false, status: "PENDING", expenseId: null, statementPaymentId: null,
  createdAt: "2026-10-18T20:00:00Z", updatedAt: "2026-10-18T20:00:00Z",
};

describe("detected purchase mapping", () => {
  it("uses integer cents and the viewer's local calendar day, leaving category and card for selection", () => {
    expect(detectedPurchaseExpense(purchase, "Detected purchase")).toEqual({
      title: "Market", merchantName: "Market", cost: "123.45", currency: "MXN", date: "2026-10-18", paymentMethod: "CREDIT_CARD",
    });
  });
  it("uses a translated fallback when the merchant is absent", () => {
    expect(detectedPurchaseExpense({ ...purchase, merchant: null, amountCents: 1 }, "Compra detectada")).toMatchObject({ title: "Compra detectada", cost: "0.01", merchantName: undefined });
  });
  it("only lists pending purchases and preserves pagination", () => {
    expect(pendingPurchaseQuery(3)).toBe("status=PENDING&page=3&limit=20");
    expect(pendingPurchaseQuery(1, 1)).toBe("status=PENDING&page=1&limit=1");
  });
});

describe("purchase mutation guard", () => {
  it("blocks overlapping submits and allows another submit after completion", async () => {
    const run = createPurchaseMutationGuard();
    let finish!: (value: boolean) => void;
    const operation = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    const first = run(operation);
    expect(await run(operation)).toBe(false);
    expect(operation).toHaveBeenCalledTimes(1);
    finish(true);
    expect(await first).toBe(true);
    expect(await run(async () => true)).toBe(true);
  });
  it("releases the guard after rejection", async () => {
    const run = createPurchaseMutationGuard();
    await expect(run(async () => { throw new Error("network"); })).rejects.toThrow("network");
    expect(await run(async () => true)).toBe(true);
  });
});

describe("card payment hint", () => {
  it.each(["Pago recibido", "GRACIAS POR TU PAGO", "Abono a tarjeta", "Payment received", "Pagó tu tarjeta", "pago", "SU PAGO FUE APLICADO"])("flags %s", (text) => {
    expect(looksLikeCardPayment(text)).toBe(true);
  });
  it.each(["Market", "Pagoda Store", "Papagos", "", null, undefined])("ignores %s", (text) => {
    expect(looksLikeCardPayment(text)).toBe(false);
  });
});

describe("card payment form defaults", () => {
  it("prefills amount in units and the local calendar day", () => {
    expect(detectedPurchasePaymentDefaults(purchase)).toEqual({ amount: "123.45", date: "2026-10-18" });
  });
  it("converts the picked day to a midday ISO timestamp", () => {
    const iso = paymentDateToIso("2026-10-18");
    expect(new Date(iso).getFullYear()).toBe(2026);
    expect(new Date(iso).getHours()).toBe(12);
    expect(new Date(iso).getDate()).toBe(18);
  });
  it("defaults the card only when unambiguous", () => {
    expect(defaultPaymentCardId([{ id: "a" }])).toBe("a");
    expect(defaultPaymentCardId([{ id: "a" }, { id: "b" }])).toBe("");
    expect(defaultPaymentCardId([])).toBe("");
  });
});

describe("card payment error mapping", () => {
  it("maps typed backend codes to i18n keys", () => {
    expect(cardPaymentErrorKey("STATEMENT_REQUIRED")).toBe("purchasePaymentStatementRequired");
    expect(cardPaymentErrorKey("STATEMENT_ALREADY_PAID")).toBe("purchasePaymentStatementPaid");
    expect(cardPaymentErrorKey("PAYMENT_CURRENCY_MISMATCH")).toBe("purchasePaymentCurrencyMismatch");
    expect(cardPaymentErrorKey("CARD_NOT_FOUND")).toBe("purchasePaymentCardNotFound");
    expect(cardPaymentErrorKey("OTHER")).toBeUndefined();
    expect(cardPaymentErrorKey(undefined)).toBeUndefined();
  });
});
