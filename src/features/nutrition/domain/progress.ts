import type { DailyPlan } from "../nutrition.types";
export function progress(plans: Pick<DailyPlan, "meals">[]): {
  planned: number;
  completed: number;
  skipped: number;
  percent: number;
} {
  const meals = plans.flatMap((plan) => plan.meals);
  const completed = meals.filter((meal) => meal.status === "completed").length;
  return {
    planned: meals.length,
    completed,
    skipped: meals.filter((meal) => meal.status === "skipped").length,
    percent: meals.length ? Math.round((completed / meals.length) * 100) : 0,
  };
}
