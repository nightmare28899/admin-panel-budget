import { describe, expect, it } from "vitest";
import { isDraftDirty, portionLine } from "../domain/dietDraft";
import type { Diet, Portion } from "../nutrition.types";

const portion = (values: Partial<Portion> = {}): Portion => ({
  id: "p",
  foodId: "f",
  foodName: "Jicama",
  quantity: null,
  unit: "",
  preparation: "",
  free: false,
  ...values,
});
const diet = (values: Partial<Diet> = {}): Diet => ({
  id: "d",
  title: "Plan",
  startDate: "2026-10-07",
  endDate: null,
  status: "draft",
  active: false,
  meals: [],
  ...values,
});

describe("isDraftDirty", () => {
  it("is true when there is no saved baseline", () => {
    expect(isDraftDirty(null, diet())).toBe(true);
  });

  it("is false when the draft equals its baseline", () => {
    expect(isDraftDirty(diet(), diet())).toBe(false);
  });

  it("is true once any field changes", () => {
    expect(isDraftDirty(diet(), diet({ title: "Other" }))).toBe(true);
    expect(isDraftDirty(diet(), diet({ endDate: "2026-11-07" }))).toBe(true);
  });

  it("is false again when an edit is reverted", () => {
    const baseline = diet({ title: "Plan" });
    const edited = { ...baseline, title: "Plan 2" };
    expect(isDraftDirty(baseline, edited)).toBe(true);
    expect(isDraftDirty(baseline, { ...edited, title: "Plan" })).toBe(false);
  });
});

describe("portionLine", () => {
  it("joins quantity, unit and preparation", () => {
    expect(
      portionLine(portion({ quantity: "1.000000000000", unit: "cup", preparation: "diced" })),
    ).toBe("1 cup diced");
  });

  it("keeps only what exists", () => {
    expect(portionLine(portion({ quantity: "10", unit: "pieces" }))).toBe("10 pieces");
    expect(portionLine(portion({ preparation: "raw" }))).toBe("raw");
    expect(portionLine(portion())).toBe("");
  });

  it("ignores the quantity of explicitly free foods", () => {
    expect(portionLine(portion({ free: true, quantity: "5", unit: "g", preparation: "any" }))).toBe(
      "any",
    );
  });
});
