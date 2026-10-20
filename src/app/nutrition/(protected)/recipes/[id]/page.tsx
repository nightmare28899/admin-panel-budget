import { notFound } from "next/navigation";
import RecipeDetailView from "@/features/nutrition/RecipeDetailView";
import { loadNutritionStateOnce } from "@/features/nutrition/nutrition.repository";
export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await loadNutritionStateOnce();
  const recipe = state.recipes.find((candidate) => candidate.id === id);
  if (!recipe) notFound();
  return <RecipeDetailView key={JSON.stringify(recipe)} recipe={recipe} />;
}
