export type WorkspaceThemeVariant = "classic" | "aurora";

export const WORKSPACE_THEME_VARIANTS: readonly WorkspaceThemeVariant[] = ["classic", "aurora"];
export const WORKSPACE_THEME_STORAGE_KEY = "budget-panel-theme";

const DEFAULT_VARIANT: WorkspaceThemeVariant = "classic";
const listeners = new Set<() => void>();
let storageWriteFailed = false;
let fallbackVariant: WorkspaceThemeVariant = DEFAULT_VARIANT;

export function isWorkspaceThemeVariant(value: unknown): value is WorkspaceThemeVariant {
  return typeof value === "string" && (WORKSPACE_THEME_VARIANTS as readonly string[]).includes(value);
}

export function getWorkspaceThemeVariant(): WorkspaceThemeVariant {
  if (storageWriteFailed) return fallbackVariant;
  try {
    const stored = window.localStorage.getItem(WORKSPACE_THEME_STORAGE_KEY);
    return isWorkspaceThemeVariant(stored) ? stored : DEFAULT_VARIANT;
  } catch {
    return fallbackVariant;
  }
}

export function getWorkspaceThemeVariantServerSnapshot(): WorkspaceThemeVariant {
  return DEFAULT_VARIANT;
}

export function subscribeWorkspaceThemeVariant(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function setWorkspaceThemeVariant(variant: WorkspaceThemeVariant) {
  if (!isWorkspaceThemeVariant(variant)) return;
  fallbackVariant = variant;
  try {
    window.localStorage.setItem(WORKSPACE_THEME_STORAGE_KEY, variant);
    storageWriteFailed = false;
  } catch {
    storageWriteFailed = true;
    // Browser privacy settings must not make the current-page picker unusable.
  }
  listeners.forEach((listener) => listener());
}
