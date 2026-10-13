import FavoritesView from "@/features/nutrition/FavoritesView";
import { loadNutritionState } from "@/features/nutrition/nutrition.repository";

export default async function FavoritesPage() {
  return <FavoritesView state={await loadNutritionState()} />;
}
