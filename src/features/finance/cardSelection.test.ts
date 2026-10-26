import { describe, expect, it } from "vitest";
import { resolveSelectedCardId } from "./cardSelection";

describe("resolveSelectedCardId", () => {
  const ids = ["a", "b", "c"];

  it("defaults to the first visible card when nothing is selected", () => {
    expect(resolveSelectedCardId(ids, undefined)).toBe("a");
  });

  it("keeps the selection while it is still visible", () => {
    expect(resolveSelectedCardId(ids, "b")).toBe("b");
  });

  it("falls back to the first visible card when the selection left the list", () => {
    expect(resolveSelectedCardId(["x", "y"], "b")).toBe("x");
  });

  it("returns undefined when there are no visible cards", () => {
    expect(resolveSelectedCardId([], "a")).toBeUndefined();
  });
});
