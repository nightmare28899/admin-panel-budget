export const DEFAULT_POST_LOGIN_PATH = "/finance/expenses";

const ALLOWED = /^\/(?:nutrition|finance)(?:[/?#].*)?$/;

/**
 * Validates the post-login `next` target. Only same-origin relative paths under
 * /nutrition or /finance are allowed; anything else yields the fallback.
 */
export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_POST_LOGIN_PATH,
): string {
  if (typeof raw !== "string" || !ALLOWED.test(raw)) return fallback;
  if (/[\\\u0000-\u001f\u007f@]/.test(raw)) return fallback;
  const path = raw.split(/[?#]/, 1)[0];
  if (path.includes("//")) return fallback;
  return raw;
}
