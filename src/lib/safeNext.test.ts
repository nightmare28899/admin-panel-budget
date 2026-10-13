import { describe, expect, it } from "vitest";
import { DEFAULT_POST_LOGIN_PATH, sanitizeNextPath } from "./safeNext";

describe("sanitizeNextPath", () => {
  it.each([
    "/nutrition",
    "/nutrition/today",
    "/nutrition/recipes/abc?x=1",
    "/finance",
    "/finance/expenses",
    "/finance/cards?month=2026-10",
  ])("allows %s", (path) => expect(sanitizeNextPath(path)).toBe(path));

  it.each([
    null,
    undefined,
    "",
    "/",
    "/admin",
    "/nutritionx",
    "/financeevil",
    "//evil.com",
    "/nutrition//evil.com",
    "///nutrition",
    "https://evil.com/nutrition",
    "javascript:alert(1)",
    "nutrition",
    "\\nutrition",
    "/nutrition\\evil",
    "/nutrition\n/x",
    "/nutrition@evil.com",
    "/user-login",
  ])("falls back for %j", (path) => expect(sanitizeNextPath(path)).toBe(DEFAULT_POST_LOGIN_PATH));

  it("uses a custom fallback", () => expect(sanitizeNextPath("/x", "/finance")).toBe("/finance"));
});
