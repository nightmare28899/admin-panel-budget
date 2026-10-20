import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./api";
import { userApi } from "./userApi";

vi.mock("./api", () => ({ API_BASE_URL: "http://localhost/api", request: vi.fn() }));

describe("detected purchase API contract", () => {
  beforeEach(() => vi.clearAllMocks());
  it("sends a bearer-authenticated pending list query", async () => {
    await userApi.detectedPurchases("token", "status=PENDING&page=2&limit=20");
    expect(request).toHaveBeenCalledWith("/detected-purchases?status=PENDING&page=2&limit=20", { method: "GET" }, "token");
  });
  it("wraps the confirmation payload in expense and encodes the identifier", async () => {
    const expense = { title: "Market", cost: "25.00", currency: "MXN", categoryId: "category" };
    await userApi.confirmDetectedPurchase("token", "id/with slash", expense);
    expect(request).toHaveBeenCalledWith("/detected-purchases/id%2Fwith%20slash/confirm", { method: "POST", body: JSON.stringify({ expense }) }, "token");
  });
  it("discards with an explicit empty JSON body", async () => {
    await userApi.discardDetectedPurchase("token", "purchase");
    expect(request).toHaveBeenCalledWith("/detected-purchases/purchase/discard", { method: "POST", body: "{}" }, "token");
  });
  it("posts the card payment body to the encoded confirm-as-payment route", async () => {
    const body = { cardId: "card", amount: 10, paidAt: "2026-10-19T12:00:00.000Z" };
    await userApi.confirmDetectedPurchaseAsPayment("token", "id/x", body);
    expect(request).toHaveBeenCalledWith("/detected-purchases/id%2Fx/confirm-as-payment", { method: "POST", body: JSON.stringify(body) }, "token");
  });
});
