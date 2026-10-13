import { describe, expect, it } from "vitest";
import {
  parseSuggestionsResponse,
  suggestionRequestSchema,
  suggestionsErrorKey,
} from "../nutrition.suggestions";
import { suggestionsErrorResponse } from "../nutrition.http";
import type { DietOption, Portion } from "../nutrition.types";

const portion = (over: Partial<Portion> = {}): Portion => ({
  id: crypto.randomUUID(),
  foodId: "pollo",
  foodName: "Pollo",
  quantity: "120",
  unit: "gr",
  preparation: "cocido",
  free: false,
  ...over,
});
const option: DietOption = {
  id: crypto.randomUUID(),
  title: "Opción 1",
  notes: "",
  recipeId: null,
  portions: [
    portion(),
    portion({
      foodId: "lechuga",
      foodName: "Lechuga",
      quantity: null,
      unit: "",
      preparation: "",
      free: true,
    }),
  ],
};
const draft = (over: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  title: "Tacos",
  type: "lunch",
  duration: 20,
  notes: "",
  imageUrl: null,
  demo: false,
  seedKey: null,
  ingredients: option.portions.map((p) => ({ ...p, id: crypto.randomUUID() })),
  steps: ["Cocina."],
  ...over,
});

describe("suggestionRequestSchema", () => {
  it("accepts a valid body and bounds count and preferences", () => {
    expect(
      suggestionRequestSchema.safeParse({ optionId: crypto.randomUUID(), count: 2 }).success,
    ).toBe(true);
    expect(suggestionRequestSchema.safeParse({ optionId: "x" }).success).toBe(false);
    expect(
      suggestionRequestSchema.safeParse({ optionId: crypto.randomUUID(), count: 4 }).success,
    ).toBe(false);
    expect(
      suggestionRequestSchema.safeParse({
        optionId: crypto.randomUUID(),
        preferences: "a".repeat(301),
      }).success,
    ).toBe(false);
  });
});

describe("parseSuggestionsResponse", () => {
  it("returns drafts that exactly match the option, flagged as not favorite", () => {
    const result = parseSuggestionsResponse({ suggestions: [draft()], warnings: ["w"] }, option);
    expect(result?.suggestions).toHaveLength(1);
    expect(result?.suggestions[0].favorite).toBe(false);
    expect(result?.warnings).toEqual(["w"]);
  });
  it("drops invalid drafts and drafts that change the prescribed portions", () => {
    const changed = draft({
      ingredients: option.portions.map((p) => ({
        ...p,
        id: crypto.randomUUID(),
        quantity: p.free ? null : "999",
      })),
    });
    const result = parseSuggestionsResponse(
      { suggestions: [changed, { title: "" }, draft()], warnings: [] },
      option,
    );
    expect(result?.suggestions).toHaveLength(1);
  });
  it("returns null for a malformed payload", () => {
    expect(parseSuggestionsResponse({ nope: true }, option)).toBeNull();
  });
});

describe("error mapping", () => {
  it("maps statuses to localized keys", () => {
    expect(suggestionsErrorKey(429)).toBe("nutSuggestErrorBusy");
    expect(suggestionsErrorKey(503)).toBe("nutSuggestErrorUnavailable");
    expect(suggestionsErrorKey(401)).toBe("nutImportErrorSession");
    expect(suggestionsErrorKey(500)).toBe("nutSuggestErrorFailed");
  });
  it.each([
    [400, 400],
    [401, 401],
    [404, 404],
    [422, 422],
    [429, 429],
    [503, 503],
    [500, 502],
  ])("proxies backend %s as %s", async (backend, expected) => {
    const response = suggestionsErrorResponse(backend);
    expect(response.status).toBe(expected);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
