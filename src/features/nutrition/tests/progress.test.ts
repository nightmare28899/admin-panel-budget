import { describe, expect, it } from "vitest";
import { progress } from "../domain/progress";
import type { DailyMeal } from "../nutrition.types";
const meal = (status: DailyMeal["status"]): DailyMeal => ({
  id: crypto.randomUUID(),
  type: "breakfast",
  time: "08:00",
  status,
  completedAt: status === "completed" ? "2026-10-06T08:00:00Z" : null,
  snapshot: {
    title: "Synthetic meal",
    optionId: crypto.randomUUID(),
    recipeId: null,
    ingredients: [],
    steps: [],
    notes: "",
  },
});
describe("derived progress", () => {
  it("returns zero for no plan", () =>
    expect(progress([])).toEqual({ planned: 0, completed: 0, skipped: 0, percent: 0 }));
  it("counts skipped meals without presenting them as completed", () =>
    expect(
      progress([
        {
          meals: [
            meal("completed"),
            meal("pending"),
            meal("skipped"),
            meal("pending"),
            meal("pending"),
          ],
        },
      ]),
    ).toEqual({ planned: 5, completed: 1, skipped: 1, percent: 20 }));
  it("computes weekly math from actual scheduled meals, not invented days", () =>
    expect(
      progress(
        Array.from({ length: 7 }, () => ({
          meals: [
            meal("completed"),
            meal("completed"),
            meal("pending"),
            meal("skipped"),
            meal("pending"),
          ],
        })),
      ),
    ).toEqual({ planned: 35, completed: 14, skipped: 7, percent: 40 }));
  it("rounds display percentages only, not food portions", () =>
    expect(
      progress([{ meals: [meal("completed"), meal("pending"), meal("pending")] }]).percent,
    ).toBe(33));
});
