import type { DietOption, Recipe } from "../nutrition.types";
import { exactQuantity, validatePortion } from "./diet";
export function validateRecipe(recipe: Recipe): void {
  if (!recipe.ingredients.length || !recipe.steps.length)
    throw new Error("Ingredients and preparation steps are required.");
  for (const portion of recipe.ingredients) validatePortion(portion, !recipe.demo);
  if (new Set(recipe.ingredients.map((portion) => portion.id)).size !== recipe.ingredients.length)
    throw new Error("Ingredient IDs must be unique.");
}
export function recipeMatchesOption(recipe: Recipe, option: DietOption): boolean {
  if (
    recipe.demo ||
    recipe.ingredients.some((portion) => !portion.free && portion.quantity === null)
  )
    return false;
  const key = (portion: Recipe["ingredients"][number]) =>
    JSON.stringify([
      portion.foodId,
      portion.free ? null : portion.quantity === null ? null : exactQuantity(portion.quantity),
      portion.unit,
      portion.preparation,
      portion.free,
    ]);
  const expected = option.portions.map(key).sort();
  const actual = recipe.ingredients.map(key).sort();
  return (
    expected.length === actual.length && expected.every((value, index) => value === actual[index])
  );
}
export function duplicateRecipe(recipe: Recipe, createId = () => crypto.randomUUID()): Recipe {
  const suffix = " (copy)";
  let title = recipe.title.slice(0, 120 - suffix.length);
  if (/[\uD800-\uDBFF]$/.test(title)) title = title.slice(0, -1);
  return {
    ...recipe,
    id: createId(),
    title: `${title.trimEnd()}${suffix}`,
    favorite: false,
    cookCount: 0,
    lastCookedAt: null,
    seedKey: null,
    ingredients: recipe.ingredients.map((portion) => ({ ...portion, id: createId() })),
    steps: [...recipe.steps],
  };
}
export function validateFreeAllowances(recipe: Recipe, options: DietOption[]): void {
  for (const ingredient of recipe.ingredients.filter((portion) => portion.free)) {
    if (
      !options.some((option) =>
        option.portions.some(
          (portion) =>
            portion.free &&
            portion.foodId === ingredient.foodId &&
            portion.unit === ingredient.unit &&
            portion.preparation === ingredient.preparation,
        ),
      )
    )
      throw new Error("Free ingredients need an explicit matching allowance in your diet.");
  }
}
