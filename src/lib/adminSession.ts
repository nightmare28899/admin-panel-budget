import { cookies } from "next/headers";
import { api } from "./api";
import { isUnauthorizedError } from "./session";

export const SESSION_EXPIRED_RESPONSE = {
  error: "Session expired. Renew or close the session to continue.",
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
