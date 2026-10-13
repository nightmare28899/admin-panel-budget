import SettingsView from "@/features/nutrition/SettingsView";
import { loadNutritionState } from "@/features/nutrition/nutrition.repository";
export default async function SettingsPage() {
  const state = await loadNutritionState();
  return <SettingsView key={JSON.stringify(state.profile)} profile={state.profile} />;
}
