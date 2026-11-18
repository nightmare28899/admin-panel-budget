import type { MealType, Portion, Recipe } from "../nutrition.types";
export function demoRecipes(): Recipe[] {
  const ingredient = (
    foodId: string,
    foodName: string,
    quantity: string | null,
    unit: string,
    preparation = "",
  ): Portion => ({
    id: crypto.randomUUID(),
    foodId,
    foodName,
    quantity,
    unit,
    preparation,
    free: false,
  });
  const groups: { type: MealType; names: string[]; portions: () => Portion[] }[] = [
    {
      type: "breakfast",
      names: [
        "Egg and avocado breakfast",
        "Breakfast skillet",
        "Gentle breakfast plate",
        "Breakfast vegetable bowl",
        "Breakfast ingredients guide",
      ],
      portions: () => [
        ingredient("egg", "Egg", "2", "piece"),
        ingredient("egg-white", "Egg white", "3", "piece"),
        ingredient("vegetables", "Vegetables", null, ""),
        ingredient("avocado", "Avocado", "3", "slice"),
      ],
    },
    {
      type: "lunch",
      names: [
        "Cooked chicken lunch",
        "Chicken vegetable bowl",
        "Lunch avocado plate",
        "Simple chicken lunch",
        "Lunch ingredients guide",
      ],
      portions: () => [
        ingredient("chicken", "Chicken", "120", "g", "cooked"),
        ingredient("vegetables", "Vegetables", "2", "cup"),
        ingredient("avocado", "Avocado", "0.5", "piece"),
      ],
    },
    {
      type: "dinner",
      names: [
        "Cooked beef dinner",
        "Beef vegetable plate",
        "Dinner avocado bowl",
        "Simple beef dinner",
        "Dinner ingredients guide",
      ],
      portions: () => [
        ingredient("beef", "Beef", "100", "g", "cooked"),
        ingredient("vegetables", "Vegetables", "1", "cup"),
        ingredient("avocado", "Avocado", "3", "slice"),
      ],
    },
    {
      type: "morning_snack",
      names: ["Snack inspiration one", "Snack inspiration two", "Snack inspiration three"],
      portions: () => [
        ingredient("unverified-snack", "Snack ingredient — verify with your plan", null, ""),
      ],
    },
  ];
  return groups.flatMap((group) =>
    group.names.map((title, index) => ({
      id: crypto.randomUUID(),
      title: `${title} · Demo`,
      type: group.type,
      ingredients: group.portions(),
      steps: [
        "Review the original prescribed diet and verify every ingredient, quantity and preparation before making a personal recipe.",
      ],
      duration: 0,
      notes:
        "Demo only. These are the supplied examples, not a prescribed or executable diet. Missing quantities and preparation details have not been invented.",
      imageUrl: null,
      demo: true,
      seedKey: `${group.type}-${index}`,
      favorite: false,
      cookCount: 0,
      lastCookedAt: null,
    })),
  );
}
