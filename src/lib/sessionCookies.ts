// Plain constants and helpers shared between userSession.ts (Server
// Actions/Components) and proxy.ts. This file must never import
// "next/headers" — the proxy can't use it.

export const USER_ACCESS_COOKIE = "user_token";
export const USER_REFRESH_COOKIE = "user_refresh_token";

export function userSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.USER_SESSION_SECURE !== "false",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
