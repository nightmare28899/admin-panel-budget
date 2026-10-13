import { redirect } from "next/navigation";
import NutritionShell from "@/features/nutrition/NutritionShell";
import NutritionUnavailable from "@/features/nutrition/NutritionUnavailable";
import {
  NutritionSessionError,
  loadNutritionState,
} from "@/features/nutrition/nutrition.repository";
import type { NutritionState } from "@/features/nutrition/nutrition.types";
import { shellUser } from "@/features/nutrition/domain/shellUser";
import { getUserMeForLayoutAction } from "@/lib/userActions";

const LOGIN_PATH = "/user-login?next=/nutrition";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  let state: NutritionState | null = null;
  try {
    state = await loadNutritionState();
  } catch (error) {
    // No token or the backend rejected it (expired): same gating as Personal Finance.
    if (error instanceof NutritionSessionError) redirect(LOGIN_PATH);
  }
  if (!state) return <NutritionUnavailable />;

  const me = await getUserMeForLayoutAction().catch(() => null);

  return (
    <NutritionShell
      user={shellUser(state.profile.name, me?.data?.user)}
      hasActiveDiet={state.diets.some((diet) => diet.active)}
    >
      {children}
    </NutritionShell>
  );
}
