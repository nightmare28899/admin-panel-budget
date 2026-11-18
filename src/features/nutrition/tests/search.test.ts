import { describe, expect, it } from "vitest";
import { recipeSearchUrl } from "../domain/search";

describe("recipeSearchUrl", () => {
  it("links to the recipes list without a query when blank", () => {
    expect(recipeSearchUrl("")).toBe("/nutrition/recipes");
    expect(recipeSearchUrl("   ")).toBe("/nutrition/recipes");
  });

  it("trims and encodes the query", () => {
    expect(recipeSearchUrl("  chicken & rice ")).toBe("/nutrition/recipes?q=chicken%20%26%20rice");
  });
});
