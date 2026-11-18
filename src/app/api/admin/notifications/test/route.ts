import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api";
import { SESSION_EXPIRED_MESSAGE, isUnauthorizedError } from "@/lib/session";
import { getValidatedAdminToken } from "@/lib/adminSession";

export async function POST(request: NextRequest) {
  const token = await getValidatedAdminToken();

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
      // "notificationFieldsRequired" is a stable i18n message key (see
      // src/i18n/messages.ts) — this route can't call t() itself, so the
      // client resolves it via frontendError()/t() before displaying it.
      return NextResponse.json(
        { error: "notificationFieldsRequired" },
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
        // "failedSendTestNotification" is a stable i18n message key (see
        // src/i18n/messages.ts) — this route can't call t() itself, so the
        // client resolves it via frontendError()/t() before displaying it.
        error: error instanceof Error ? error.message : "failedSendTestNotification",
      },
      { status: 500 },
    );
  }
}
