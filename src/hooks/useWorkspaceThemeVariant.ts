"use client";

import { useSyncExternalStore } from "react";
import { getWorkspaceThemeVariant, getWorkspaceThemeVariantServerSnapshot, setWorkspaceThemeVariant, subscribeWorkspaceThemeVariant } from "@/lib/workspaceTheme";

export function useWorkspaceThemeVariant() {
  const variant = useSyncExternalStore(subscribeWorkspaceThemeVariant, getWorkspaceThemeVariant, getWorkspaceThemeVariantServerSnapshot);
  return { variant, setVariant: setWorkspaceThemeVariant };
}
