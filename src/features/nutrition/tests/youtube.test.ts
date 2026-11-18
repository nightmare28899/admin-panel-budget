import { describe, expect, it } from "vitest";
import { youtubeSearchUrl } from "../domain/youtube";

describe("youtubeSearchUrl", () => {
  it("builds an https YouTube search url for the recipe title", () => {
    const url = new URL(youtubeSearchUrl("Pollo a la plancha"));
    expect(url.origin).toBe("https://www.youtube.com");
    expect(url.pathname).toBe("/results");
    expect(url.searchParams.get("search_query")).toBe("Pollo a la plancha receta");
  });

  it("encodes special characters so the query cannot inject parameters", () => {
    const url = new URL(youtubeSearchUrl("Tacos & salsa #1?x=y"));
    expect(url.searchParams.get("search_query")).toBe("Tacos & salsa #1?x=y receta");
    expect([...url.searchParams.keys()]).toEqual(["search_query"]);
    expect(url.hash).toBe("");
  });

  it("trims and collapses whitespace", () => {
    const url = new URL(youtubeSearchUrl("  Ensalada   verde \n"));
    expect(url.searchParams.get("search_query")).toBe("Ensalada verde receta");
  });
});
