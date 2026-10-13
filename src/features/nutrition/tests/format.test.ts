import { describe, expect, it } from "vitest";
import { formatQuantity, optionLabel } from "../domain/format";

describe("formatQuantity", () => {
  it("drops trailing zeros from stored decimals", () => {
    expect(formatQuantity("100.000000000000")).toBe("100");
    expect(formatQuantity("0.500000000000")).toBe("0.5");
    expect(formatQuantity("2.250000000000")).toBe("2.25");
  });

  it("keeps integers and plain values untouched", () => {
    expect(formatQuantity("3")).toBe("3");
    expect(formatQuantity("10.5")).toBe("10.5");
  });

  it("returns null for missing quantities", () => {
    expect(formatQuantity(null)).toBeNull();
    expect(formatQuantity(undefined)).toBeNull();
  });
});

describe("optionLabel", () => {
  const portion = (foodName: string) => ({ foodName });

  it("adds the first foods to a generic option title", () => {
    expect(
      optionLabel({ title: "Opción 1", portions: [portion("bistec"), portion("verduras al vapor"), portion("aguacate")] }),
    ).toBe("Opción 1 · bistec, verduras al vapor, aguacate");
  });

  it("summarises long food lists", () => {
    expect(
      optionLabel({ title: "Opción 2", portions: ["a", "b", "c", "d", "e"].map(portion) }),
    ).toBe("Opción 2 · a, b, c +2");
  });

  it("falls back to the title when there are no foods", () => {
    expect(optionLabel({ title: "Opción 3", portions: [] })).toBe("Opción 3");
  });
});
