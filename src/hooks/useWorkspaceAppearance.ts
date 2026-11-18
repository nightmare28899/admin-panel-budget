"use client";

import { useSyncExternalStore } from "react";
import { getWorkspaceAppearance, getWorkspaceAppearanceServerSnapshot, setWorkspaceAppearance, subscribeWorkspaceAppearance } from "@/lib/workspaceAppearance";

export function useWorkspaceAppearance() {
  const appearance = useSyncExternalStore(subscribeWorkspaceAppearance, getWorkspaceAppearance, getWorkspaceAppearanceServerSnapshot);
  return { appearance, setAppearance: setWorkspaceAppearance };
}
