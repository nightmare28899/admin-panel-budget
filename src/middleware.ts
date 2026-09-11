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

// The finance layout is a Server Component and can't write cookies during
// render, so it can't refresh an expired access token on its own — it would
// just bounce the user to login. Middleware runs before that render and CAN
// write cookies, so this is where proactive refresh belongs.
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

export async function middleware(request: NextRequest) {
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
        // Backend hiccup, not a truly dead session — don't force a logout.
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

    // Forward the fresh tokens on the request itself so the Server Component
    // rendering this same response reads the new access token instead of the
    // expired one it saw when the browser sent the request.
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
    // Network/backend failure: let the request through and let the
    // page-level guard decide, instead of bouncing the user on a transient
    // error.
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/finance/:path*"],
};
