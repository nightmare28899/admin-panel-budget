const RECIPES_PATH = "/nutrition/recipes";

/** Recipes page URL pre-filtered by a free-text query; blank queries link to the plain list. */
export function recipeSearchUrl(query: string): string {
  const value = query.trim();
  return value ? `${RECIPES_PATH}?q=${encodeURIComponent(value)}` : RECIPES_PATH;
}
