import { NextRequest, NextResponse } from "next/server";
import {
  USER_ACCESS_COOKIE,
  USER_REFRESH_COOKIE,
  userSessionCookieOptions,
} from "@/lib/sessionCookies";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://app.kevinlg.cloud/api";

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

function isAccessTokenExpired(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return true;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { exp?: number };
    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function buildCookieHeader(
  existing: { name: string; value: string }[],
  overrides: Record<string, string>,
): string {
  const cookieMap = new Map(existing.map((cookie) => [cookie.name, cookie.value]));
  for (const [name, value] of Object.entries(overrides)) {
    cookieMap.set(name, value);
  }
  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(USER_ACCESS_COOKIE)?.value;

  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(USER_REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.next();
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status !== 401) {
        return NextResponse.next();
      }

      const response = NextResponse.redirect(
        new URL("/user-login?reason=expired", request.url),
      );
      response.cookies.delete(USER_ACCESS_COOKIE);
      response.cookies.delete(USER_REFRESH_COOKIE);
      return response;
    }

    const session = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(
      "cookie",
      buildCookieHeader(request.cookies.getAll(), {
        [USER_ACCESS_COOKIE]: session.accessToken,
        [USER_REFRESH_COOKIE]: session.refreshToken,
      }),
    );

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    const cookieOptions = userSessionCookieOptions();
    response.cookies.set(USER_ACCESS_COOKIE, session.accessToken, cookieOptions);
    response.cookies.set(USER_REFRESH_COOKIE, session.refreshToken, cookieOptions);
    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/finance/:path*"],
};
