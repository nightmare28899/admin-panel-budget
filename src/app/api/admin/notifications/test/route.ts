import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { api } from "@/lib/api";
import { SESSION_EXPIRED_MESSAGE, isUnauthorizedError } from "@/lib/session";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    return NextResponse.json(
      { error: SESSION_EXPIRED_MESSAGE, requiresSessionRenewal: true },
      { status: 401 },
    );
  }

  try {
    const payload = (await request.json()) as {
      userId?: string;
      title?: string;
      body?: string;
    };

    if (!payload.userId || !payload.title || !payload.body) {
      return NextResponse.json(
        { error: "userId, title, and body are required" },
        { status: 400 },
      );
    }

    const result = await api.sendTestPush(token, {
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
    });

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
          error instanceof Error ? error.message : "Failed to send test push",
      },
      { status: 500 },
    );
  }
}
