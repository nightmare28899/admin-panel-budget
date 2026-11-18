export type ToastType = "success" | "error";

export type ToastItem = { id: number; message: string; type: ToastType };

export const SUCCESS_DURATION_MS = 3500;
export const ERROR_DURATION_MS = 6000;
export const MAX_VISIBLE_TOASTS = 5;

export function durationFor(type: ToastType): number {
  return type === "error" ? ERROR_DURATION_MS : SUCCESS_DURATION_MS;
}

export function pushToast(
  state: ToastItem[],
  toast: Omit<ToastItem, "id">,
  id: number,
): ToastItem[] {
  return [...state, { ...toast, id }].slice(-MAX_VISIBLE_TOASTS);
}

export function dismissToast(state: ToastItem[], id: number): ToastItem[] {
  return state.filter((item) => item.id !== id);
}
