import { cookies } from "next/headers";
import type { LoginResponse } from "./api";

export const USER_SESSION_EXPIRED = "User session expired. Sign in again.";
const ACCESS = "user_token";
const REFRESH = "user_refresh_token";

export async function getUserToken() {
  return (await cookies()).get(ACCESS)?.value ?? null;
}

export async function getUserRefreshToken() {
  return (await cookies()).get(REFRESH)?.value ?? null;
}

export function userGoogleAuthEnabled() {
  return process.env.USER_GOOGLE_AUTH_ENABLED === "true";
}

function secureCookies() {
  return process.env.USER_SESSION_SECURE !== "false";
}

export async function setUserSession(session: LoginResponse) {
  const store = await cookies();
  const options = { httpOnly: true, secure: secureCookies(), sameSite: "strict" as const, path: "/", maxAge: 60 * 60 * 24 * 7 };
  store.set(ACCESS, session.accessToken, options);
  store.set(REFRESH, session.refreshToken, options);
}

export async function clearUserSession() {
  const store = await cookies();
  store.delete(ACCESS);
  store.delete(REFRESH);
}
