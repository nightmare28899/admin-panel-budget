"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dietSchema, profileSchema, recipeSchema } from "./nutrition.schemas";
import {
  NutritionSessionError,
  loadNutritionState,
  nutritionCommand,
} from "./nutrition.repository";
import { exactQuantity, validateDiet } from "./domain/diet";
import {
  duplicateRecipe,
  recipeMatchesOption,
  validateRecipe,
  validateFreeAllowances,
} from "./domain/recipe";
import { demoRecipes } from "./seed/recipes";
import type { ActionResult, DailyMeal, Portion } from "./nutrition.types";
async function mutation(operation: () => Promise<void>): Promise<ActionResult> {
  try {
    await operation();
    revalidatePath("/nutrition", "layout");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof NutritionSessionError
          ? "Your session expired. Sign in again."
          : error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Check the form.")
          : error instanceof Error
            ? error.message
            : "This change could not be saved.",
    };
  }
}
const normalize = (portion: Portion): Portion => ({
  ...portion,
  quantity: portion.quantity === null ? null : exactQuantity(portion.quantity),
});
export async function saveDietAction(input: unknown) {
  return mutation(async () => {
    const diet = dietSchema.parse(input);
    diet.status = "draft";
    diet.active = false;
    diet.meals = diet.meals.map((meal) => ({
      ...meal,
      options: meal.options.map((option) => ({
        ...option,
        portions: option.portions.map(normalize),
      })),
    }));
    validateDiet(diet);
    const state = await loadNutritionState();
    for (const meal of diet.meals)
      for (const option of meal.options)
        if (option.recipeId) {
          const recipe = state.recipes.find((candidate) => candidate.id === option.recipeId);
          if (!recipe || recipe.type !== meal.type || !recipeMatchesOption(recipe, option))
            throw new Error(
              "Associate only a recipe with the exact same foods, quantities, units and preparation.",
            );
        }
    await nutritionCommand("save_diet", diet);
  });
}
export async function verifyDietAction(id: string, acknowledged: boolean) {
  return mutation(async () => {
    z.uuid().parse(id);
    if (!acknowledged)
      throw new Error("Confirm that the manual transcription matches your original diet.");
    const state = await loadNutritionState();
    const diet = state.diets.find((candidate) => candidate.id === id);
    if (!diet) throw new Error("Diet unavailable.");
    validateDiet(diet, true);
    await nutritionCommand("verify_diet", { id, acknowledged });
  });
}
export async function activateDietAction(id: string) {
  return mutation(async () => {
    z.uuid().parse(id);
    await nutritionCommand("activate_diet", { id });
  });
}
export async function saveRecipeAction(input: unknown) {
  return mutation(async () => {
    const recipe = recipeSchema.parse(input);
    recipe.ingredients = recipe.ingredients.map(normalize);
    validateRecipe(recipe);
    const state = await loadNutritionState();
    validateFreeAllowances(
      recipe,
      state.diets.flatMap((diet) => diet.meals.flatMap((meal) => meal.options)),
    );
    await nutritionCommand("save_recipe", recipe);
  });
}
export async function duplicateRecipeAction(id: string) {
  return mutation(async () => {
    z.uuid().parse(id);
    const state = await loadNutritionState();
    const recipe = state.recipes.find((candidate) => candidate.id === id);
    if (!recipe) throw new Error("Recipe unavailable.");
    const copy = recipeSchema.parse(duplicateRecipe(recipe));
    validateRecipe(copy);
    validateFreeAllowances(
      copy,
      state.diets.flatMap((diet) => diet.meals.flatMap((meal) => meal.options)),
    );
    await nutritionCommand("save_recipe", copy);
  });
}
export async function deleteRecipeAction(id: string) {
  return mutation(async () => {
    z.uuid().parse(id);
    await nutritionCommand("delete_recipe", { id });
  });
}
export async function favoriteRecipeAction(id: string, favorite: boolean) {
  return mutation(async () => {
    z.uuid().parse(id);
    z.boolean().parse(favorite);
    await nutritionCommand("favorite", { id, favorite });
  });
}
export async function cookRecipeAction(id: string) {
  return mutation(async () => {
    z.uuid().parse(id);
    await nutritionCommand("cook_recipe", { id });
  });
}
export async function undoCookRecipeAction(id: string) {
  return mutation(async () => {
    z.uuid().parse(id);
    await nutritionCommand("undo_cook_recipe", { id });
  });
}
export async function seedRecipesAction() {
  return mutation(async () => {
    for (const recipe of demoRecipes()) await nutritionCommand("save_recipe", recipe);
  });
}
export async function generatePlanAction() {
  return mutation(() => nutritionCommand("generate_plan"));
}
export async function completeMealAction(id: string, status: DailyMeal["status"]) {
  return mutation(async () => {
    z.uuid().parse(id);
    z.enum(["pending", "completed", "skipped"]).parse(status);
    await nutritionCommand("completion", { id, status });
  });
}
export async function chooseRecipeAction(id: string, recipeId: string) {
  return mutation(async () => {
    z.uuid().parse(id);
    z.uuid().parse(recipeId);
    await nutritionCommand("choose_recipe", { id, recipeId });
  });
}
export async function settingsAction(input: unknown) {
  return mutation(async () => {
    const profile = profileSchema.parse(input);
    const state = await loadNutritionState();
    if (profile.id !== state.profile.id) throw new Error("Profile unavailable.");
    await nutritionCommand("settings", profile);
  });
}
