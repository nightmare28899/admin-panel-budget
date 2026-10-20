import DietView from "@/features/nutrition/DietView";
import { loadNutritionStateOnce } from "@/features/nutrition/nutrition.repository";
export default async function DietPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string | string[] }>;
}) {
  const { new: createNew } = await searchParams;
  return <DietView state={await loadNutritionStateOnce()} startNew={createNew === "1"} />;
}
