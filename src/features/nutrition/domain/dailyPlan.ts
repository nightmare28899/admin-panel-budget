import type { DailyMeal, DailyPlan, Diet, Profile, Recipe } from "../nutrition.types";
import { canExecuteDiet, validateDiet } from "./diet";
import { recipeMatchesOption } from "./recipe";
export type OptimisticMeals = { source: DailyPlan | undefined; meals: DailyMeal[] };
export function resolveDailyMeals(
  plan: DailyPlan | undefined,
  optimistic: OptimisticMeals | null,
): DailyMeal[] {
  // Optimistic changes belong to one server snapshot, never a later refresh.
  return optimistic && optimistic.source === plan ? optimistic.meals : (plan?.meals ?? []);
}
export function localDate(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function generateDailyPlan(input: {
  profile: Profile;
  diet: Diet;
  recipes: Recipe[];
  date: string;
  existing?: DailyPlan;
  createId?: () => string;
}): DailyPlan {
  if (input.existing) return input.existing;
  if (!canExecuteDiet(input.diet, input.date))
    throw new Error("Activate a verified diet covering this date first.");
  validateDiet(input.diet, true);
  const createId = input.createId ?? (() => crypto.randomUUID());
  return {
    id: createId(),
    date: input.date,
    timezone: input.profile.timezone,
    dietId: input.diet.id,
    meals: input.diet.meals.map((meal) => {
      const option = meal.options[0];
      const recipe = input.recipes.find((candidate) => candidate.id === option.recipeId);
      if (option.recipeId && (!recipe || !recipeMatchesOption(recipe, option)))
        throw new Error("Associated recipe no longer matches this diet option.");
      return {
        id: createId(),
        type: meal.type,
        time: input.profile.times[meal.type],
        status: "pending",
        completedAt: null,
        snapshot: structuredClone({
          title: recipe?.title ?? option.title,
          optionId: option.id,
          recipeId: recipe?.id ?? null,
          ingredients: option.portions,
          steps: recipe?.steps ?? [],
          notes: option.notes,
        }),
      };
    }),
  };
}
export function transitionMeal(
  meal: DailyMeal,
  status: DailyMeal["status"],
  now = new Date().toISOString(),
): DailyMeal {
  if (meal.status === status) return meal;
  return { ...meal, status, completedAt: status === "completed" ? now : null };
}
