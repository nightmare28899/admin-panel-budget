import { describe, expect, it } from "vitest";
import {
  generateDailyPlan,
  localDate,
  resolveDailyMeals,
  transitionMeal,
} from "../domain/dailyPlan";
import { mealTypes, type Diet, type Profile } from "../nutrition.types";
const profile: Profile = {
  id: crypto.randomUUID(),
  name: "Test",
  timezone: "America/Mexico_City",
  theme: "light",
  times: {
    breakfast: "08:00",
    morning_snack: "11:00",
    lunch: "14:00",
    afternoon_snack: "17:00",
    dinner: "20:00",
  },
};
const diet = (): Diet => ({
  id: crypto.randomUUID(),
  title: "Synthetic diet",
  startDate: "2026-10-06",
  endDate: null,
  status: "verified",
  active: true,
  meals: mealTypes.map((type) => ({
    id: crypto.randomUUID(),
    type,
    options: [
      {
        id: crypto.randomUUID(),
        title: "Synthetic option",
        notes: "Keep exact",
        recipeId: null,
        portions: [
          {
            id: crypto.randomUUID(),
            foodId: "synthetic-food",
            foodName: "Synthetic test food",
            quantity: "1",
            unit: "piece",
            preparation: "",
            free: false,
          },
        ],
      },
    ],
  })),
});
const plan = () => generateDailyPlan({ profile, diet: diet(), recipes: [], date: "2026-10-06" });
describe("daily plan lifecycle", () => {
  it("shows a newly generated plan instead of the initial empty client meals", () => {
    const initial = { source: undefined, meals: [] };
    expect(resolveDailyMeals(undefined, null)).toEqual([]);
    const generated = plan();
    expect(resolveDailyMeals(generated, initial)).toBe(generated.meals);
  });
  it("keeps optimistic changes only until a new server snapshot arrives", () => {
    const original = plan();
    const optimistic = {
      source: original,
      meals: original.meals.map((meal) => transitionMeal(meal, "completed")),
    };
    expect(resolveDailyMeals(original, optimistic)).toBe(optimistic.meals);
    const refreshed = structuredClone(original);
    refreshed.meals[0].snapshot.title = "New saved recipe selection";
    expect(resolveDailyMeals(refreshed, optimistic)).toBe(refreshed.meals);
    expect(resolveDailyMeals(undefined, optimistic)).toEqual([]);
  });
  it("uses local date west and east of UTC without date-only drift", () => {
    expect(localDate("America/Mexico_City", new Date("2026-10-06T01:00:00Z"))).toBe("2026-10-05");
    expect(localDate("Asia/Tokyo", new Date("2026-10-06T23:00:00Z"))).toBe("2026-10-07");
  });
  it("creates exactly five independently identified meals", () => {
    const value = plan();
    expect(value.meals.map((meal) => meal.type)).toEqual([...mealTypes]);
    expect(new Set(value.meals.map((meal) => meal.id)).size).toBe(5);
    expect(value.meals.every((meal) => meal.status === "pending")).toBe(true);
  });
  it("returns an existing day without replacing snapshots or timezone", () => {
    const existing = plan();
    const changedProfile = { ...profile, timezone: "UTC" };
    expect(
      generateDailyPlan({
        profile: changedProfile,
        diet: diet(),
        recipes: [],
        date: existing.date,
        existing,
      }),
    ).toBe(existing);
  });
  it("rejects unverified, inactive and unknown-quantity diets", () => {
    const value = diet();
    expect(() =>
      generateDailyPlan({
        profile,
        diet: { ...value, status: "pending_verification" },
        recipes: [],
        date: "2026-10-06",
      }),
    ).toThrow();
    value.meals[0].options[0].portions[0].quantity = null;
    expect(() =>
      generateDailyPlan({ profile, diet: value, recipes: [], date: "2026-10-06" }),
    ).toThrow();
  });
  it("snapshots remain unchanged when source diet changes", () => {
    const source = diet();
    const value = generateDailyPlan({ profile, diet: source, recipes: [], date: "2026-10-06" });
    source.meals[0].options[0].portions[0].quantity = "2";
    source.meals[0].options[0].notes = "Changed";
    expect(value.meals[0].snapshot.ingredients[0].quantity).toBe("1");
    expect(value.meals[0].snapshot.notes).toBe("Keep exact");
  });
  it("rejects a stale associated recipe", () => {
    const source = diet();
    source.meals[0].options[0].recipeId = crypto.randomUUID();
    expect(() =>
      generateDailyPlan({ profile, diet: source, recipes: [], date: "2026-10-06" }),
    ).toThrow();
  });
  it("marking twice retains first timestamp and unmarking twice is safe", () => {
    const original = plan().meals[0];
    const completed = transitionMeal(original, "completed", "2026-10-06T08:00:00Z");
    expect(transitionMeal(completed, "completed", "2026-10-06T09:00:00Z")).toBe(completed);
    const pending = transitionMeal(completed, "pending");
    expect(pending.completedAt).toBeNull();
    expect(transitionMeal(pending, "pending")).toBe(pending);
    expect(pending.snapshot).toBe(original.snapshot);
  });
  it("skip clears completion without mutating prescribed foods", () => {
    const meal = plan().meals[0];
    const skipped = transitionMeal(transitionMeal(meal, "completed"), "skipped");
    expect(skipped.status).toBe("skipped");
    expect(skipped.completedAt).toBeNull();
    expect(skipped.snapshot).toBe(meal.snapshot);
  });
});
