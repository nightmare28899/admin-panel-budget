import RecipesView from "@/features/nutrition/RecipesView";
import { loadNutritionState } from "@/features/nutrition/nutrition.repository";
export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ option?: string | string[]; q?: string | string[] }>;
}) {
  const { option, q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  return (
    <RecipesView
      key={query}
      initialQuery={query}
      state={await loadNutritionState()}
      initialOptionId={typeof option === "string" ? option : undefined}
    />
  );
}
