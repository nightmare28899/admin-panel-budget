import { describe, expect, it } from "vitest";
import {
  ERROR_DURATION_MS,
  SUCCESS_DURATION_MS,
  dismissToast,
  durationFor,
  pushToast,
  type ToastItem,
} from "./toastQueue";

describe("toastQueue", () => {
  it("appends toasts with increasing ids so several can coexist", () => {
    let state: ToastItem[] = [];
    state = pushToast(state, { message: "a", type: "success" }, 1);
    state = pushToast(state, { message: "b", type: "error" }, 2);
    expect(state.map((x) => x.id)).toEqual([1, 2]);
    expect(state.map((x) => x.message)).toEqual(["a", "b"]);
  });

  it("dismisses only the requested toast", () => {
    let state: ToastItem[] = [];
    state = pushToast(state, { message: "a", type: "success" }, 1);
    state = pushToast(state, { message: "b", type: "error" }, 2);
    expect(dismissToast(state, 1).map((x) => x.id)).toEqual([2]);
    expect(dismissToast(state, 99)).toHaveLength(2);
  });

  it("keeps errors visible longer than successes", () => {
    expect(durationFor("success")).toBe(SUCCESS_DURATION_MS);
    expect(durationFor("error")).toBe(ERROR_DURATION_MS);
    expect(ERROR_DURATION_MS).toBeGreaterThan(SUCCESS_DURATION_MS);
  });

  it("caps the stack, dropping the oldest", () => {
    let state: ToastItem[] = [];
    for (let i = 1; i <= 8; i++) state = pushToast(state, { message: `m${i}`, type: "success" }, i);
    expect(state).toHaveLength(5);
    expect(state[0].id).toBe(4);
  });
});
