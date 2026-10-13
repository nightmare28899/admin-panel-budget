import type { Recipe } from "../nutrition.types";

/** Favorite recipes only, sorted by title without mutating the input. */
export function favoriteRecipes(recipes: Recipe[]): Recipe[] {
  return recipes
    .filter((recipe) => recipe.favorite)
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}
