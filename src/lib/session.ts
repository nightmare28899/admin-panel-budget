export const SESSION_EXPIRED_MESSAGE =
  "Session expired. Renew or close the session to continue.";

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
