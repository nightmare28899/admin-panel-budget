import TodayView from "@/features/nutrition/TodayView";
import { loadNutritionState } from "@/features/nutrition/nutrition.repository";

export default async function TodayPage() {
  const state = await loadNutritionState();
  return <TodayView key={JSON.stringify(state.plans)} state={state} />;
}
