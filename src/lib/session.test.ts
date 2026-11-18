import { describe, expect, it } from "vitest";
import { isUnauthorizedApiError } from "./session";

describe("isUnauthorizedApiError", () => {
  it("is true for an error carrying status 401", () => {
    expect(isUnauthorizedApiError(Object.assign(new Error("x"), { status: 401 }))).toBe(true);
  });

  it("is false for other statuses and plain errors", () => {
    expect(isUnauthorizedApiError(Object.assign(new Error("x"), { status: 500 }))).toBe(false);
    expect(isUnauthorizedApiError(new Error("fetch failed"))).toBe(false);
    expect(isUnauthorizedApiError("401")).toBe(false);
    expect(isUnauthorizedApiError(null)).toBe(false);
  });
});
