import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  USER_ACCESS_COOKIE,
  USER_REFRESH_COOKIE,
  adminSessionCookieOptions,
  userSessionCookieOptions,
} from "@/lib/sessionCookies";
import { sanitizeNextPath } from "@/lib/safeNext";
import {
  GateDecision,
  GateKind,
  RefreshResult,
  decideAfterRefresh,
  decideSessionGate,
} from "@/lib/sessionGate";

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

type Surface = {
  accessCookie: string;
  refreshCookie: string;
  cookieOptions: () => ReturnType<typeof userSessionCookieOptions>;
  loginPath: string;
  /** Protected routes: send visitors without any cookie to the login page. */
  redirectAnonymous: boolean;
  homePath: (request: NextRequest) => string;
};

const USER_SURFACE: Surface = {
  accessCookie: USER_ACCESS_COOKIE,
  refreshCookie: USER_REFRESH_COOKIE,
  cookieOptions: userSessionCookieOptions,
  loginPath: "/user-login",
  redirectAnonymous: false,
  homePath: (request) => sanitizeNextPath(request.nextUrl.searchParams.get("next")),
};

const ADMIN_SURFACE: Surface = {
  accessCookie: ADMIN_ACCESS_COOKIE,
  refreshCookie: ADMIN_REFRESH_COOKIE,
  cookieOptions: adminSessionCookieOptions,
  loginPath: "/login",
  redirectAnonymous: true,
  homePath: () => "/dashboard/users",
};

function resolveRoute(pathname: string): { surface: Surface; kind: GateKind } {
  if (pathname === "/login") return { surface: ADMIN_SURFACE, kind: "login" };
  if (pathname === "/user-login") return { surface: USER_SURFACE, kind: "login" };
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return { surface: ADMIN_SURFACE, kind: "protected" };
  }
  return { surface: USER_SURFACE, kind: "protected" };
}

async function refreshSession(
  refreshToken: string,
): Promise<{ result: RefreshResult; session?: { accessToken: string; refreshToken: string } }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (res.status === 401) return { result: "unauthorized" };
    if (!res.ok) return { result: "error" };
    return { result: "ok", session: await res.json() };
  } catch {
    return { result: "error" };
  }
}

function applyDecision(
  request: NextRequest,
  surface: Surface,
  decision: GateDecision,
  session?: { accessToken: string; refreshToken: string },
): NextResponse {
  const clear = (response: NextResponse) => {
    response.cookies.delete(surface.accessCookie);
    response.cookies.delete(surface.refreshCookie);
    return response;
  };
  const setSession = (response: NextResponse) => {
    if (!session) return response;
    const options = surface.cookieOptions();
    response.cookies.set(surface.accessCookie, session.accessToken, options);
    response.cookies.set(surface.refreshCookie, session.refreshToken, options);
    return response;
  };

  switch (decision.type) {
    case "redirectHome":
      return NextResponse.redirect(new URL(surface.homePath(request), request.url));
    case "redirectHomeWithSession":
      return setSession(NextResponse.redirect(new URL(surface.homePath(request), request.url)));
    case "redirectLogin": {
      const target = new URL(surface.loginPath, request.url);
      if (decision.expired) target.searchParams.set("reason", "expired");
      const response = NextResponse.redirect(target);
      return decision.clearCookies ? clear(response) : response;
    }
    case "continueWithSession": {
      if (!session) return NextResponse.next();
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set(
        "cookie",
        buildCookieHeader(request.cookies.getAll(), {
          [surface.accessCookie]: session.accessToken,
          [surface.refreshCookie]: session.refreshToken,
        }),
      );
      return setSession(NextResponse.next({ request: { headers: requestHeaders } }));
    }
    default: {
      const response = NextResponse.next();
      return decision.type === "continue" && decision.clearCookies ? clear(response) : response;
    }
  }
}

export async function proxy(request: NextRequest) {
  const { surface, kind } = resolveRoute(request.nextUrl.pathname);
  const accessToken = request.cookies.get(surface.accessCookie)?.value;
  const refreshToken = request.cookies.get(surface.refreshCookie)?.value;

  const decision = decideSessionGate({
    kind,
    accessValid: Boolean(accessToken) && !isAccessTokenExpired(accessToken as string),
    hasRefreshToken: Boolean(refreshToken),
    reasonExpired: request.nextUrl.searchParams.get("reason") === "expired",
    redirectAnonymous: surface.redirectAnonymous,
  });

  if (decision.type !== "refresh") {
    return applyDecision(request, surface, decision);
  }

  const { result, session } = await refreshSession(refreshToken as string);
  return applyDecision(request, surface, decideAfterRefresh(kind, result), session);
}

export const config = {
  matcher: [
    "/finance/:path*",
    "/nutrition/:path*",
    "/api/nutrition/:path*",
    "/dashboard/:path*",
    "/login",
    "/user-login",
  ],
};
