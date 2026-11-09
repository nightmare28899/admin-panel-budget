import { frontendError } from "@/i18n/errors";
import type { MessageKey } from "@/i18n/messages";

type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

export type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

type ResultLike = { error?: string; data?: unknown };

type FeedbackOptions = {
  /** i18n key of the message shown when the action succeeds. */
  success: MessageKey;
  /** i18n key used when the failure carries no usable message. */
  fallback?: MessageKey;
};

/** Toasts the outcome of an action result and returns whether it succeeded. */
export function notifyResult(
  toast: ToastApi,
  t: Translate,
  result: ResultLike,
  options: FeedbackOptions,
): boolean {
  if (result.error) {
    toast.error(frontendError(result.error, t, options.fallback ?? "requestFailedGeneric"));
    return false;
  }
  toast.success(t(options.success));
  return true;
}

export type FeedbackOutcome<R> = { ok: true; result: R } | { ok: false; result?: R };

/**
 * Runs an action, toasting its outcome. A thrown exception is converted into an
 * error toast so callers never end up with a silently stuck UI.
 */
export async function runWithFeedback<R extends ResultLike>(
  toast: ToastApi,
  t: Translate,
  action: () => Promise<R>,
  options: FeedbackOptions,
): Promise<FeedbackOutcome<R>> {
  try {
    const result = await action();
    return notifyResult(toast, t, result, options) ? { ok: true, result } : { ok: false, result };
  } catch (err) {
    toast.error(
      frontendError(err instanceof Error ? err.message : undefined, t, options.fallback ?? "requestFailedGeneric"),
    );
    return { ok: false };
  }
}
