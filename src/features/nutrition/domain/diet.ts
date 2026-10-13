import type { Diet, Portion } from "../nutrition.types";
export function exactQuantity(input: string): string {
  const value = input.trim();
  if (/^\d+\/\d+$/.test(value)) {
    let [numerator, denominator] = value.split("/").map(BigInt);
    if (denominator === BigInt(0)) throw new Error("Quantity denominator cannot be zero.");
    let a = numerator;
    let b = denominator;
    while (b !== BigInt(0)) {
      const remainder = a % b;
      a = b;
      b = remainder;
    }
    numerator /= a;
    denominator /= a;
    let rest = denominator;
    while (rest % BigInt(2) === BigInt(0)) rest /= BigInt(2);
    while (rest % BigInt(5) === BigInt(0)) rest /= BigInt(5);
    if (rest !== BigInt(1))
      throw new Error(
        "This fraction has no exact decimal representation. Keep the prescribed unit instead of rounding.",
      );
    const scale = BigInt(10) ** BigInt(12);
    if ((numerator * scale) % denominator !== BigInt(0))
      throw new Error("Quantity exceeds twelve decimal places.");
    return exactQuantity(
      `${(numerator * scale) / denominator / scale}.${(((numerator * scale) / denominator) % scale).toString().padStart(12, "0")}`,
    );
  }
  if (!/^\d{1,12}(\.\d{1,12})?$/.test(value))
    throw new Error("Use a positive exact decimal or terminating fraction.");
  const [whole, fraction = ""] = value.split(".");
  const normalized = `${BigInt(whole)}${fraction.replace(/0+$/, "") ? `.${fraction.replace(/0+$/, "")}` : ""}`;
  if (normalized === "0") throw new Error("Quantity must be greater than zero.");
  return normalized;
}
export function validatePortion(portion: Portion, executable = true): void {
  if (!portion.foodId.trim() || !portion.foodName.trim())
    throw new Error("Food identity and name are required.");
  if (portion.free) {
    if (portion.quantity !== null)
      throw new Error("Explicit free foods must not carry a prescribed quantity.");
    return;
  }
  if (portion.quantity === null) {
    if (executable) throw new Error("Unknown portions must be verified before use in a plan.");
    return;
  }
  exactQuantity(portion.quantity);
  if (!portion.unit.trim()) throw new Error("A prescribed unit is required.");
}
export function validateDiet(diet: Diet, executable = false): void {
  if (new Set(diet.meals.map((meal) => meal.type)).size !== 5)
    throw new Error("Provide each of the five meal types exactly once.");
  if (diet.endDate && diet.endDate < diet.startDate)
    throw new Error("End date must follow start date.");
  for (const meal of diet.meals) {
    if (executable && !meal.options.length) throw new Error("Every meal needs a verified option.");
    for (const option of meal.options)
      for (const portion of option.portions) validatePortion(portion, executable);
  }
  const ids = diet.meals.flatMap((meal) => [
    meal.id,
    ...meal.options.flatMap((option) => [
      option.id,
      ...option.portions.map((portion) => portion.id),
    ]),
  ]);
  if (new Set(ids).size !== ids.length)
    throw new Error("Meal, option and portion IDs must be unique.");
}
export function canExecuteDiet(diet: Diet, date: string): boolean {
  return (
    diet.status === "verified" &&
    diet.active &&
    date >= diet.startDate &&
    (!diet.endDate || date <= diet.endDate)
  );
}
