import { describe, expect, it } from "vitest";
import { messages } from "@/i18n/messages";

const REQUIRED = [
  "nutPhRecipeTitle",
  "nutPhDietTitle",
  "nutPhOptionTitle",
  "nutPhFoodId",
  "nutPhFoodName",
  "nutPhQuantity",
  "nutPhUnit",
  "nutPhPreparation",
  "nutPhNotes",
  "nutPhSteps",
  "nutPhDuration",
  "nutPhImageUrl",
  "nutPhDate",
  "nutPhSearchRecipes",
  "nutPhPreferences",
  "nutPhName",
  "nutPhTimezone",
  "nutPhMealType",
];

const phKeys = (locale: Record<string, string>) =>
  Object.keys(locale)
    .filter((key) => key.startsWith("nutPh"))
    .sort();

describe("nutrition placeholders i18n", () => {
  it("defines every required nutPh key with a non-empty string in en and es", () => {
    for (const locale of [messages.en, messages.es] as Record<string, string>[]) {
      for (const key of REQUIRED) {
        expect(typeof locale[key], key).toBe("string");
        expect(locale[key].trim().length, key).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the same nutPh key set in en and es", () => {
    expect(phKeys(messages.es)).toEqual(phKeys(messages.en));
  });
});
