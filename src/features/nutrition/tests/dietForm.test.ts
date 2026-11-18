import { describe, expect, it } from "vitest";
import { initialExpanded, isOptionIncomplete, mealTabStatus, summarizeOption } from "../domain/dietForm";
import type { DietOption, Portion } from "../nutrition.types";

const portion = (values: Partial<Portion>): Portion => ({
  id: "p",
  foodId: "f",
  foodName: "rice",
  quantity: null,
  unit: "",
  preparation: "",
  free: false,
  ...values,
});
const option = (values: Partial<DietOption> = {}): DietOption => ({
  id: "o",
  title: "Option 1",
  portions: [portion({})],
  notes: "",
  recipeId: null,
  ...values,
});

describe("summarizeOption", () => {
  it("shows quantity and unit when present", () => {
    const summary = summarizeOption(
      option({
        portions: [
          portion({ foodName: "chicken", quantity: "120.000000000000", unit: "g" }),
          portion({ foodName: "rice", quantity: "1", unit: "cup" }),
        ],
      }),
    );
    expect(summary).toBe("chicken 120 g · rice 1 cup");
  });

  it("shows only the name for free foods and missing quantities", () => {
    const summary = summarizeOption(
      option({
        portions: [
          portion({ foodName: "salad", free: true, quantity: "5", unit: "g" }),
          portion({ foodName: "egg" }),
        ],
      }),
    );
    expect(summary).toBe("salad · egg");
  });

  it("skips unnamed portions and returns empty for none", () => {
    expect(summarizeOption(option({ portions: [portion({ foodName: " " })] }))).toBe("");
    expect(summarizeOption(option({ portions: [] }))).toBe("");
  });

  it("truncates after the limit with an ellipsis and remaining count", () => {
    const portions = ["a", "b", "c", "d", "e"].map((foodName) => portion({ foodName }));
    expect(summarizeOption(option({ portions }), 3)).toBe("a · b · c · … +2");
    expect(summarizeOption(option({ portions }), 5)).toBe("a · b · c · d · e");
  });
});

describe("mealTabStatus", () => {
  it("counts options and flags empty meals", () => {
    expect(mealTabStatus({ options: [] })).toEqual({ count: 0, missing: true });
    expect(mealTabStatus({ options: [option(), option()] })).toEqual({ count: 2, missing: false });
  });
});

describe("isOptionIncomplete", () => {
  it("flags empty title, no portions or unnamed food", () => {
    expect(isOptionIncomplete(option())).toBe(false);
    expect(isOptionIncomplete(option({ title: "  " }))).toBe(true);
    expect(isOptionIncomplete(option({ portions: [] }))).toBe(true);
    expect(isOptionIncomplete(option({ portions: [portion({ foodName: "" })] }))).toBe(true);
    expect(isOptionIncomplete(option({ portions: [portion({ foodId: "" })] }))).toBe(true);
  });
});

describe("initialExpanded", () => {
  it("expands new options", () => {
    expect(initialExpanded(option(), 3, true)).toBe(true);
  });
  it("expands incomplete options", () => {
    expect(initialExpanded(option({ title: "" }), 3, false)).toBe(true);
  });
  it("expands a lone option", () => {
    expect(initialExpanded(option(), 1, false)).toBe(true);
  });
  it("collapses complete existing options among several", () => {
    expect(initialExpanded(option(), 2, false)).toBe(false);
  });
});

describe("rememberExpandedDefaults", () => {
  it("decides each option once and never recomputes it", async () => {
    const { rememberExpandedDefaults } = await import("../domain/dietForm");
    const incomplete = option({ id: "a", title: "" });
    const cache: Record<string, boolean> = {};

    rememberExpandedDefaults(cache, [incomplete, option({ id: "b" })]);
    expect(cache).toEqual({ a: true, b: false });

    // The user fixes option "a"; coming back to the tab must not flip its default.
    rememberExpandedDefaults(cache, [option({ id: "a", title: "Fixed" }), option({ id: "b" })]);
    expect(cache.a).toBe(true);
  });

  it("registers options added later without touching the known ones", async () => {
    const { rememberExpandedDefaults } = await import("../domain/dietForm");
    const cache: Record<string, boolean> = { a: false };
    rememberExpandedDefaults(cache, [option({ id: "a" }), option({ id: "c", title: "" })]);
    expect(cache).toEqual({ a: false, c: true });
  });
});
