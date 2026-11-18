import TodayView from "@/features/nutrition/TodayView";
import { loadNutritionStateOnce } from "@/features/nutrition/nutrition.repository";

export default async function TodayPage() {
  const state = await loadNutritionStateOnce();
  return <TodayView key={JSON.stringify(state.plans)} state={state} />;
}
