import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../nutrition.repository", () => ({
  NutritionSessionError: class NutritionSessionError extends Error {},
  loadNutritionState: vi.fn(),
  nutritionCommand: vi.fn(),
}));

import { cookRecipeAction, undoCookRecipeAction } from "../nutrition.actions";
import { nutritionCommand } from "../nutrition.repository";

const uuid = "12345678-1234-4234-8234-123456789abc";

describe("cook recipe actions", () => {
  beforeEach(() => vi.mocked(nutritionCommand).mockReset());

  it("sends the cook_recipe command with the recipe id", async () => {
    await expect(cookRecipeAction(uuid)).resolves.toEqual({ success: true });
    expect(nutritionCommand).toHaveBeenCalledWith("cook_recipe", { id: uuid });
  });

  it("sends the undo_cook_recipe command with the recipe id", async () => {
    await expect(undoCookRecipeAction(uuid)).resolves.toEqual({ success: true });
    expect(nutritionCommand).toHaveBeenCalledWith("undo_cook_recipe", { id: uuid });
  });

  it("rejects an invalid id without calling the backend", async () => {
    await expect(cookRecipeAction("nope")).resolves.toMatchObject({ success: false });
    expect(nutritionCommand).not.toHaveBeenCalled();
  });
});
