// This is a stable i18n message key (see src/i18n/messages.ts), not literal
// English text — this file runs outside React and can't call t() itself, so
// UI call sites resolve it via frontendError()/t() before displaying it.
export const SESSION_EXPIRED_MESSAGE = "sessionExpiredMessage";

export type ActionResult<T> = {
  data?: T;
  error?: string;
  requiresSessionRenewal?: boolean;
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Action failed";
}

export function isUnauthorizedError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return message.includes("401") || message.toLowerCase().includes("unauthorized");
}

export class SessionRenewalRequiredError extends Error {
  constructor(message = SESSION_EXPIRED_MESSAGE) {
    super(message);
    this.name = "SessionRenewalRequiredError";
  }
}

export function isSessionRenewalRequiredError(
  error: unknown,
): error is SessionRenewalRequiredError {
  return error instanceof SessionRenewalRequiredError;
}
