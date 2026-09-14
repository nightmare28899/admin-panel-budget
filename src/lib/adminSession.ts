import { cookies } from "next/headers";
import { api } from "./api";
import { isUnauthorizedError } from "./session";

// "error" is a stable i18n message key (see src/i18n/messages.ts), not
// literal English text — the client resolves it via t() before displaying it.
export const SESSION_EXPIRED_RESPONSE = {
  error: "sessionExpiredMessage",
  requiresSessionRenewal: true,
} as const;

export async function getValidatedAdminToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const profile = await api.getMe(token);
    if ((profile.user?.role || "").toLowerCase() !== "admin") {
      return null;
    }

    return token;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return null;
    }

    throw error;
  }
}
