import type { DietMeal, DietOption } from "../nutrition.types";
import { formatQuantity } from "./format";

const DEFAULT_SUMMARY_ITEMS = 3;

/** Compact one-line description of an option's foods for collapsed cards. */
export function summarizeOption(
  option: Pick<DietOption, "portions">,
  maxItems: number = DEFAULT_SUMMARY_ITEMS,
): string {
  const items = option.portions
    .filter((portion) => portion.foodName.trim() !== "")
    .map((portion) => {
      const name = portion.foodName.trim();
      const quantity = portion.free ? null : formatQuantity(portion.quantity);
      if (!quantity) return name;
      const unit = portion.unit.trim();
      return unit ? `${name} ${quantity} ${unit}` : `${name} ${quantity}`;
    });
  const shown = items.slice(0, maxItems);
  const extra = items.length - shown.length;
  return (extra > 0 ? [...shown, `… +${extra}`] : shown).join(" · ");
}

/** Option count per meal; a meal without options blocks activation. */
export function mealTabStatus(meal: Pick<DietMeal, "options">): { count: number; missing: boolean } {
  return { count: meal.options.length, missing: meal.options.length === 0 };
}

/** True when the option lacks a title, has no foods, or a food lacks identity/name. */
export function isOptionIncomplete(option: Pick<DietOption, "title" | "portions">): boolean {
  return (
    option.title.trim() === "" ||
    option.portions.length === 0 ||
    option.portions.some(
      (portion) => portion.foodId.trim() === "" || portion.foodName.trim() === "",
    )
  );
}

/** Whether an option card starts expanded when first shown. */
export function initialExpanded(
  option: Pick<DietOption, "title" | "portions">,
  optionCount: number,
  isNew: boolean,
): boolean {
  return isNew || optionCount === 1 || isOptionIncomplete(option);
}

/**
 * Freezes each option's default expanded state the first time it is seen, so
 * remounting a card (e.g. switching meal tabs) never changes it afterwards.
 */
export function rememberExpandedDefaults(
  cache: Record<string, boolean>,
  options: Pick<DietOption, "id" | "title" | "portions">[],
): Record<string, boolean> {
  for (const option of options)
    if (!(option.id in cache)) cache[option.id] = initialExpanded(option, options.length, false);
  return cache;
}
