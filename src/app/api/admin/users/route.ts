import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api";
import { SESSION_EXPIRED_MESSAGE, isUnauthorizedError } from "@/lib/session";
import { getValidatedAdminToken } from "@/lib/adminSession";

export async function GET(request: NextRequest) {
  const token = await getValidatedAdminToken();

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
