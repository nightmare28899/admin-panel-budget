import DietView from "@/features/nutrition/DietView";
import { loadNutritionState } from "@/features/nutrition/nutrition.repository";
export default async function DietPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string | string[] }>;
}) {
  const { new: createNew } = await searchParams;
  return <DietView state={await loadNutritionState()} startNew={createNew === "1"} />;
}
