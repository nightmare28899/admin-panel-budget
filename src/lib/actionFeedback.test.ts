import { describe, expect, it, vi } from "vitest";
import { messages, type MessageKey } from "@/i18n/messages";
import { notifyResult, runWithFeedback } from "./actionFeedback";

const t = (key: MessageKey, values?: Record<string, string | number>) => {
  let text: string = messages.en[key];
  for (const [k, v] of Object.entries(values ?? {})) text = text.replace(`{${k}}`, String(v));
  return text;
};
const makeToast = () => ({ success: vi.fn(), error: vi.fn() });

describe("notifyResult", () => {
  it("shows the success message and returns true when there is no error", () => {
    const toast = makeToast();
    expect(notifyResult(toast, t, {}, { success: "subscriptionCreated" })).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Subscription created");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows a literal backend error and returns false", () => {
    const toast = makeToast();
    expect(notifyResult(toast, t, { error: "Boom" }, { success: "subscriptionCreated" })).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Boom");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("translates error message keys", () => {
    const toast = makeToast();
    notifyResult(toast, t, { error: "sessionExpiredMessage" }, { success: "subscriptionCreated" });
    expect(toast.error).toHaveBeenCalledWith(messages.en.sessionExpiredMessage);
  });

  it("falls back to the generic error when the message is empty", () => {
    const toast = makeToast();
    notifyResult(toast, t, { error: "" }, { success: "subscriptionCreated" });
    expect(toast.success).toHaveBeenCalled();
  });

  it("uses the supplied fallback key for a missing error text", () => {
    const toast = makeToast();
    notifyResult(toast, t, { error: "requestFailedGeneric" }, { success: "subscriptionCreated" });
    expect(toast.error).toHaveBeenCalledWith("Request failed");
  });
});

describe("runWithFeedback", () => {
  it("returns the result and toasts success", async () => {
    const toast = makeToast();
    const result = await runWithFeedback(toast, t, async () => ({ data: 1 }), { success: "subscriptionCreated" });
    expect(result).toEqual({ ok: true, result: { data: 1 } });
    expect(toast.success).toHaveBeenCalledWith("Subscription created");
  });

  it("toasts the error for a failed result", async () => {
    const toast = makeToast();
    const result = await runWithFeedback(toast, t, async () => ({ error: "Nope" }), { success: "subscriptionCreated" });
    expect(result.ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Nope");
  });

  it("converts a thrown exception into an error toast", async () => {
    const toast = makeToast();
    const result = await runWithFeedback(
      toast,
      t,
      async () => {
        throw new Error("network down");
      },
      { success: "subscriptionCreated" },
    );
    expect(result.ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("network down");
  });

  it("uses the generic message for a non-Error throw", async () => {
    const toast = makeToast();
    await runWithFeedback(
      toast,
      t,
      async () => {
        throw undefined;
      },
      { success: "subscriptionCreated" },
    );
    expect(toast.error).toHaveBeenCalledWith("Request failed");
  });
});
