export type WorkspaceAppearance = "light" | "dark";

const STORAGE_KEY = "budget-panel-appearance";
const listeners = new Set<() => void>();
let storageWriteFailed = false;
let fallbackAppearance: WorkspaceAppearance = "light";

export function getWorkspaceAppearance(): WorkspaceAppearance {
  if (storageWriteFailed) return fallbackAppearance;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return fallbackAppearance;
  }
}

export function getWorkspaceAppearanceServerSnapshot(): WorkspaceAppearance {
  return "light";
}

export function subscribeWorkspaceAppearance(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function setWorkspaceAppearance(appearance: WorkspaceAppearance) {
  fallbackAppearance = appearance;
  try {
    window.localStorage.setItem(STORAGE_KEY, appearance);
    storageWriteFailed = false;
  } catch {
    storageWriteFailed = true;
    // Browser privacy settings must not make the current-page toggle unusable.
  }
  listeners.forEach((listener) => listener());
}
