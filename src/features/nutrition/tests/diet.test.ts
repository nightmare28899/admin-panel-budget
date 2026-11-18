import { describe, expect, it } from "vitest";
import { canExecuteDiet, exactQuantity, validateDiet, validatePortion } from "../domain/diet";
import { mealTypes, type Diet, type Portion } from "../nutrition.types";
const portion = (): Portion => ({
  id: crypto.randomUUID(),
  foodId: "synthetic-food",
  foodName: "Synthetic test food",
  quantity: "0.5",
  unit: "cup",
  preparation: "cooked",
  free: false,
});
const diet = (): Diet => ({
  id: crypto.randomUUID(),
  title: "Synthetic test diet",
  startDate: "2026-10-06",
  endDate: "2026-10-07",
  status: "verified",
  active: true,
  meals: mealTypes.map((type) => ({
    id: crypto.randomUUID(),
    type,
    options: [
      {
        id: crypto.randomUUID(),
        title: "Synthetic option",
        portions: [portion()],
        notes: "",
        recipeId: null,
      },
    ],
  })),
});
describe("exact diet portions", () => {
  it.each([
    ["0002.5000", "2.5"],
    ["1/2", "0.5"],
    ["3/6", "0.5"],
    ["1/8", "0.125"],
    ["999999999999.999999999999", "999999999999.999999999999"],
  ])("normalizes %s without rounding", (input, expected) =>
    expect(exactQuantity(input)).toBe(expected),
  );
  it.each(["0", "0/2", "-1", "1/0", "1/3", "1e3", "1,5", "0.0000000000001", "1000000000000"])(
    "rejects unsupported quantity %s",
    (input) => expect(() => exactQuantity(input)).toThrow(),
  );
  it("keeps unspecified vegetables unknown, not free", () => {
    const food = { ...portion(), foodId: "vegetables", quantity: null };
    expect(() => validatePortion(food, false)).not.toThrow();
    expect(() => validatePortion(food, true)).toThrow();
    expect(food.free).toBe(false);
  });
  it("requires an explicit free flag and no amount", () => {
    expect(() => validatePortion({ ...portion(), free: true })).toThrow();
    expect(() => validatePortion({ ...portion(), free: true, quantity: null })).not.toThrow();
  });
  it("requires a unit for specified portions", () =>
    expect(() => validatePortion({ ...portion(), unit: "" })).toThrow());
  it("requires each of five meal types once", () => {
    const value = diet();
    value.meals[1].type = "breakfast";
    expect(() => validateDiet(value, true)).toThrow();
  });
  it("requires verified alternatives for every executable meal", () => {
    const value = diet();
    value.meals[0].options = [];
    expect(() => validateDiet(value, false)).not.toThrow();
    expect(() => validateDiet(value, true)).toThrow();
  });
  it("rejects end dates before start", () => {
    const value = diet();
    value.endDate = "2026-10-05";
    expect(() => validateDiet(value)).toThrow();
  });
  it("rejects duplicated portion IDs", () => {
    const value = diet();
    value.meals[1].options[0].portions[0].id = value.meals[0].options[0].portions[0].id;
    expect(() => validateDiet(value)).toThrow();
  });
  it("does not execute uploads, drafts, inactive or out-of-range diets", () => {
    const value = diet();
    expect(canExecuteDiet(value, "2026-10-06")).toBe(true);
    expect(canExecuteDiet({ ...value, status: "pending_verification" }, "2026-10-06")).toBe(false);
    expect(canExecuteDiet({ ...value, active: false }, "2026-10-06")).toBe(false);
    expect(canExecuteDiet(value, "2026-10-08")).toBe(false);
  });
});
