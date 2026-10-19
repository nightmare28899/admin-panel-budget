import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { userApi } from "./userApi";
import { getUserToken } from "./userSession";
import { confirmDetectedPurchaseAction, discardDetectedPurchaseAction, getDetectedPurchasesAction } from "./userActions";

vi.mock("./userApi", () => ({ userApi: { me: vi.fn(), detectedPurchases: vi.fn(), confirmDetectedPurchase: vi.fn(), discardDetectedPurchase: vi.fn() } }));
vi.mock("./userSession", () => ({ getUserToken: vi.fn(), getUserRefreshToken: vi.fn(), setUserSession: vi.fn(), clearUserSession: vi.fn(), USER_SESSION_EXPIRED: "sessionExpiredMessage", userGoogleAuthEnabled: vi.fn() }));
const id = "ef3c0f55-e5a0-4aa8-88ab-956306ae40dd";
const expense = { title: "Market", cost: "25.00", currency: "MXN", categoryId: id };

describe("detected purchase server actions", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(getUserToken).mockResolvedValue("server-token"); vi.mocked(userApi.me).mockResolvedValue({ user: { id, email: "test@example.com", name: "Test", role: "USER" } }); });
  it("uses the server token and pending-only pagination", async () => {
    vi.mocked(userApi.detectedPurchases).mockResolvedValue({ purchases: [], pagination: { page: 2, limit: 20, totalCount: 0, totalPages: 0, hasNext: false, hasPrev: true } });
    expect(await getDetectedPurchasesAction(2)).toHaveProperty("data.purchases", []);
    expect(userApi.detectedPurchases).toHaveBeenCalledWith("server-token", "status=PENDING&page=2&limit=20");
  });
  it("rejects invalid pagination and mutation payloads before contacting the API", async () => {
    expect(await getDetectedPurchasesAction(0)).toHaveProperty("error");
    expect(await confirmDetectedPurchaseAction(id, { ...expense, cost: "-25" })).toHaveProperty("error");
    expect(await discardDetectedPurchaseAction("../expense")).toHaveProperty("error");
    expect(userApi.detectedPurchases).not.toHaveBeenCalled();
    expect(userApi.confirmDetectedPurchase).not.toHaveBeenCalled();
    expect(userApi.discardDetectedPurchase).not.toHaveBeenCalled();
  });
  it("checks the authenticated session before confirming and forwards only parsed expense fields", async () => {
    await confirmDetectedPurchaseAction(id, expense);
    expect(userApi.me).toHaveBeenCalledWith("server-token");
    expect(userApi.confirmDetectedPurchase).toHaveBeenCalledWith("server-token", id, expense);
  });
  it("reports session expiry rather than inventing an empty inbox", async () => {
    vi.mocked(getUserToken).mockResolvedValue(null);
    expect(await getDetectedPurchasesAction()).toEqual({ error: "sessionExpiredMessage", sessionExpired: true });
    expect(userApi.detectedPurchases).not.toHaveBeenCalled();
  });
  it("preserves server conflict messages and codes for user-visible retry", async () => {
    vi.mocked(userApi.discardDetectedPurchase).mockRejectedValue(new ApiError(409, "Already confirmed", { code: "PURCHASE_ALREADY_CONFIRMED" }));
    expect(await discardDetectedPurchaseAction(id)).toMatchObject({ error: "Already confirmed", errorCode: "PURCHASE_ALREADY_CONFIRMED" });
  });
});
