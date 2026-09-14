import { cookies } from "next/headers";
import type { LoginResponse } from "./api";
import {
  USER_ACCESS_COOKIE,
  USER_REFRESH_COOKIE,
  userSessionCookieOptions,
} from "./sessionCookies";

// This is a stable i18n message key (see src/i18n/messages.ts), not literal
// English text — this file can't call t() itself, so UI call sites resolve
// it via frontendError()/t() before displaying it.
export const USER_SESSION_EXPIRED = "userSessionExpiredMessage";

export async function getUserToken() {
  return (await cookies()).get(USER_ACCESS_COOKIE)?.value ?? null;
}

export async function getUserRefreshToken() {
  return (await cookies()).get(USER_REFRESH_COOKIE)?.value ?? null;
}

export function userGoogleAuthEnabled() {
  return process.env.USER_GOOGLE_AUTH_ENABLED === "true";
}

export async function setUserSession(session: LoginResponse) {
  const store = await cookies();
  const options = userSessionCookieOptions();
  store.set(USER_ACCESS_COOKIE, session.accessToken, options);
  store.set(USER_REFRESH_COOKIE, session.refreshToken, options);
}

export async function clearUserSession() {
  const store = await cookies();
  store.delete(USER_ACCESS_COOKIE);
  store.delete(USER_REFRESH_COOKIE);
}
