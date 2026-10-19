import { describe, expect, it } from "vitest";
import { messages } from "./messages";

describe("pending purchase labels", () => {
  it("provides concise sidebar labels without shortening the page titles", () => {
    expect(messages.en.pendingPurchasesNav).toBe("Pending");
    expect(messages.es.pendingPurchasesNav).toBe("Pendientes");
    expect(messages.en.pendingPurchases).toBe("Pending approvals");
    expect(messages.es.pendingPurchases).toBe("Pendientes de aceptar");
  });
});
