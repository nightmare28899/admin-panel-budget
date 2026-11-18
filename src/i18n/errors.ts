import { messages, type MessageKey } from "./messages";

type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

const knownMessageKeys = new Set<string>(Object.keys(messages.en));

/**
 * Some of our own lib/server-action code reports errors as stable message
 * keys (e.g. "sessionExpiredMessage") instead of literal English text, so the
 * UI can translate them. A real backend/API error is still arbitrary dynamic
 * text we cannot translate, so it is only recognized as a key when it
 * actually matches one.
 */
export function isMessageKey(value: string): value is MessageKey {
  return knownMessageKeys.has(value);
}

// src/lib/api.ts can't call t() (it runs outside React), so its status-only
// fallback error is encoded as "requestFailedWithStatus:<status>" — a stable
// key carrying its own {status} interpolation value.
const STATUS_ERROR_PREFIX = "requestFailedWithStatus:";

export function frontendError(
  backendMessage: string | undefined,
  t: Translate,
  fallback: MessageKey,
): string {
  if (!backendMessage) return t(fallback);
  if (backendMessage.startsWith(STATUS_ERROR_PREFIX)) {
    return t("requestFailedWithStatus", { status: backendMessage.slice(STATUS_ERROR_PREFIX.length) });
  }
  if (isMessageKey(backendMessage)) return t(backendMessage);
  return backendMessage;
}
