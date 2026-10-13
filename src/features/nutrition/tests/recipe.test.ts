import { describe, expect, it } from "vitest";
import {
  duplicateRecipe,
  recipeMatchesOption,
  validateFreeAllowances,
  validateRecipe,
} from "../domain/recipe";
import { demoRecipes } from "../seed/recipes";
import type { DietOption, Recipe } from "../nutrition.types";
import { recipeSchema, storedRecipeSchema } from "../nutrition.schemas";
const recipe = (): Recipe => ({
  ...demoRecipes().find((value) => value.type === "lunch")!,
  demo: false,
  seedKey: null,
});
const option = (value: Recipe): DietOption => ({
  id: crypto.randomUUID(),
  title: "Synthetic test option",
  portions: structuredClone(value.ingredients),
  notes: "",
  recipeId: null,
});
describe("strict recipe associations", () => {
  it.each(["x".repeat(120), "😀".repeat(60)])(
    "keeps repeated maximum-length duplicates schema-valid",
    (title) => {
      let value = recipeSchema.parse({ ...recipe(), title });
      for (let index = 0; index < 25; index++) {
        value = recipeSchema.parse(duplicateRecipe(value));
        expect(value.title.length).toBeLessThanOrEqual(120);
        expect(value.title.endsWith(" (copy)")).toBe(true);
        expect(value.title).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
      }
    },
  );
  it("matches decimal equivalent amounts with identical food identities", () => {
    const value = recipe();
    const meal = option(value);
    meal.portions[2].quantity = "1/2";
    expect(recipeMatchesOption(value, meal)).toBe(true);
  });
  it.each(["foodId", "unit", "preparation"] as const)("rejects changed %s semantics", (field) => {
    const value = recipe();
    const meal = option(value);
    meal.portions[0][field] += "-changed";
    expect(recipeMatchesOption(value, meal)).toBe(false);
  });
  it("rejects changed quantity", () => {
    const value = recipe();
    const meal = option(value);
    meal.portions[0].quantity = "121";
    expect(recipeMatchesOption(value, meal)).toBe(false);
  });
  it("never splits vegetables or substitutes an additional food", () => {
    const value = recipe();
    const meal = option(value);
    value.ingredients.push({
      ...value.ingredients[1],
      id: crypto.randomUUID(),
      foodId: "other-vegetable",
    });
    expect(recipeMatchesOption(value, meal)).toBe(false);
  });
  it("requires explicit diet allowance for free ingredients", () => {
    const value = recipe();
    value.ingredients[1] = { ...value.ingredients[1], quantity: null, free: true };
    expect(() => validateFreeAllowances(value, [])).toThrow();
    expect(() => validateFreeAllowances(value, [option(value)])).not.toThrow();
    const meal = option(value);
    meal.portions[1].free = false;
    expect(() => validateFreeAllowances(value, [meal])).toThrow();
  });
  it("excludes all demo recipes even when supplied quantities are complete", () => {
    const value = recipe();
    expect(recipeMatchesOption({ ...value, demo: true }, option(value))).toBe(false);
  });
  it("rejects unknown personal recipe quantities", () => {
    const value = recipe();
    value.ingredients[0].quantity = null;
    expect(() => validateRecipe(value)).toThrow();
  });
  it("duplicates with independent identities and no seed or favorite lineage", () => {
    const value = {
      ...recipe(),
      favorite: true,
      seedKey: "seed",
      cookCount: 4,
      lastCookedAt: "2026-10-08T13:42:12.542128-06:00",
    };
    const copy = duplicateRecipe(value);
    expect(copy.id).not.toBe(value.id);
    expect(copy.ingredients[0].id).not.toBe(value.ingredients[0].id);
    expect(copy.seedKey).toBeNull();
    expect(copy.favorite).toBe(false);
    expect(copy.cookCount).toBe(0);
    expect(copy.lastCookedAt).toBeNull();
    copy.steps[0] = "Changed";
    expect(copy.steps).not.toEqual(value.steps);
  });
  it("parses cook tracking and defaults it for payloads that predate it", () => {
    const legacy: Record<string, unknown> = { ...recipe() };
    delete legacy.cookCount;
    delete legacy.lastCookedAt;
    expect(storedRecipeSchema.parse(legacy)).toMatchObject({ cookCount: 0, lastCookedAt: null });
    const cooked = storedRecipeSchema.parse({
      ...legacy,
      cookCount: 2,
      lastCookedAt: "2026-10-08T13:42:12.542128-06:00",
    });
    expect(cooked.cookCount).toBe(2);
    expect(cooked.lastCookedAt).toBe("2026-10-08T13:42:12.542128-06:00");
    expect(() => storedRecipeSchema.parse({ ...legacy, cookCount: -1 })).toThrow();
    expect(() => storedRecipeSchema.parse({ ...legacy, lastCookedAt: "not a date" })).toThrow();
  });
  it("creates exactly eighteen labeled non-active demo recipes", () => {
    const values = demoRecipes();
    expect(values).toHaveLength(18);
    expect(values.filter((value) => value.type === "breakfast")).toHaveLength(5);
    expect(values.filter((value) => value.type === "lunch")).toHaveLength(5);
    expect(values.filter((value) => value.type === "dinner")).toHaveLength(5);
    expect(values.filter((value) => value.type.includes("snack"))).toHaveLength(3);
    expect(values.every((value) => value.demo && value.title.includes("Demo"))).toBe(true);
    expect(values.flatMap((value) => value.ingredients).some((portion) => portion.free)).toBe(
      false,
    );
    expect(
      values[0].ingredients.find((portion) => portion.foodId === "vegetables")?.quantity,
    ).toBeNull();
  });
});
