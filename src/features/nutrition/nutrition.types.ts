export const mealTypes = [
  "breakfast",
  "morning_snack",
  "lunch",
  "afternoon_snack",
  "dinner",
] as const;
export type MealType = (typeof mealTypes)[number];
export type Portion = {
  id: string;
  foodId: string;
  foodName: string;
  quantity: string | null;
  unit: string;
  preparation: string;
  free: boolean;
};
export type DietOption = {
  id: string;
  title: string;
  portions: Portion[];
  notes: string;
  recipeId: string | null;
};
export type DietMeal = { id: string; type: MealType; options: DietOption[] };
export type Diet = {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  status: "draft" | "pending_verification" | "verified";
  active: boolean;
  meals: DietMeal[];
};
export type Recipe = {
  id: string;
  title: string;
  type: MealType;
  ingredients: Portion[];
  steps: string[];
  duration: number;
  notes: string;
  imageUrl: string | null;
  demo: boolean;
  seedKey: string | null;
  favorite: boolean;
  cookCount: number;
  lastCookedAt: string | null;
};
export type Profile = {
  id: string;
  name: string;
  timezone: string;
  times: Record<MealType, string>;
  theme: "light" | "dark";
};
export type MealSnapshot = {
  title: string;
  optionId: string;
  recipeId: string | null;
  ingredients: Portion[];
  steps: string[];
  notes: string;
};
export type DailyMeal = {
  id: string;
  type: MealType;
  time: string;
  snapshot: MealSnapshot;
  status: "pending" | "completed" | "skipped";
  completedAt: string | null;
};
export type DailyPlan = {
  id: string;
  date: string;
  timezone: string;
  dietId: string;
  meals: DailyMeal[];
};
export type OriginalFile = {
  id: string;
  dietId: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
};
export type NutritionState = {
  profile: Profile;
  diets: Diet[];
  recipes: Recipe[];
  plans: DailyPlan[];
  files: OriginalFile[];
};
export type ActionResult = { success: true } | { success: false; error: string };
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };
