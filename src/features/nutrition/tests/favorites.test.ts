import { describe, expect, it } from "vitest";
import { favoriteRecipes } from "../domain/favorites";
import { demoRecipes } from "../seed/recipes";
import type { Recipe } from "../nutrition.types";

const make = (title: string, favorite: boolean): Recipe => ({
  ...demoRecipes()[0],
  id: crypto.randomUUID(),
  title,
  favorite,
});

describe("favoriteRecipes", () => {
  it("returns only favorites sorted by title", () => {
    const result = favoriteRecipes([make("Zebra", true), make("Skip", false), make("alpha", true)]);
    expect(result.map((recipe) => recipe.title)).toEqual(["alpha", "Zebra"]);
  });

  it("returns an empty list when nothing is favorited and does not mutate input", () => {
    const input = [make("B", false), make("A", false)];
    expect(favoriteRecipes(input)).toEqual([]);
    expect(input.map((recipe) => recipe.title)).toEqual(["B", "A"]);
  });
});
