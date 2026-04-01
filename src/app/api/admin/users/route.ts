import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { api } from "@/lib/api";
import { SESSION_EXPIRED_MESSAGE, isUnauthorizedError } from "@/lib/session";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    return NextResponse.json(
      { error: SESSION_EXPIRED_MESSAGE, requiresSessionRenewal: true },
      { status: 401 },
    );
  }

  const includeDisabled =
    request.nextUrl.searchParams.get("includeDisabled") === "true";

  try {
    const result = await api.getUsers(token, includeDisabled);
    return NextResponse.json(result);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json(
        { error: SESSION_EXPIRED_MESSAGE, requiresSessionRenewal: true },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load admin users",
      },
      { status: 500 },
    );
  }
}
