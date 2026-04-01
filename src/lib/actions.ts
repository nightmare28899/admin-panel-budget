"use server";

import { cookies } from "next/headers";
import { api, LoginResponse } from "./api";
import {
    ActionResult,
    SESSION_EXPIRED_MESSAGE,
    isUnauthorizedError,
} from "./session";

const TOKEN_KEY = "admin_token";
const REFRESH_KEY = "admin_refresh_token";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function isAdminRole(role: string | undefined): boolean {
    return (role || "").toLowerCase() === "admin";
}

function setSessionCookies(cookieStore: CookieStore, session: LoginResponse) {
    cookieStore.set(TOKEN_KEY, session.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    cookieStore.set(REFRESH_KEY, session.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
    });
}

function clearSessionCookies(cookieStore: CookieStore) {
    cookieStore.delete(TOKEN_KEY);
    cookieStore.delete(REFRESH_KEY);
}

export async function loginAction(email: string, password: string) {
    try {
        const res = await api.login(email, password);

        if (!isAdminRole(res.user?.role)) {
            return { error: "You don’t have permissions to access this platform." };
        }

        const cookieStore = await cookies();
        setSessionCookies(cookieStore, res);

        return { success: true };
    } catch (err) {
        return { error: err instanceof Error ? err.message : "Login failed" };
    }
}

export async function logoutAction() {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_KEY)?.value;

    try {
        if (token) {
            await api.logout(token);
        }
    } catch {
        // Best-effort server-side revocation only.
    }

    clearSessionCookies(cookieStore);
    return { success: true };
}

export async function renewSessionAction() {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
        await logoutAction();
        return { error: SESSION_EXPIRED_MESSAGE };
    }

    try {
        const refreshed = await api.refreshToken(refreshToken);
        if (!isAdminRole(refreshed.user?.role)) {
            await logoutAction();
            return { error: "You don’t have permissions to access this platform." };
        }
        const cookieStore = await cookies();
        setSessionCookies(cookieStore, refreshed);
        return { success: true };
    } catch {
        await logoutAction();
        return { error: SESSION_EXPIRED_MESSAGE };
    }
}

async function getToken() {
    const cookieStore = await cookies();
    return cookieStore.get(TOKEN_KEY)?.value;
}

async function getRefreshToken() {
    const cookieStore = await cookies();
    return cookieStore.get(REFRESH_KEY)?.value;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Action failed";
}

async function withAuthRetry<T>(actionFn: (token: string) => Promise<T>): Promise<ActionResult<T>> {
    const token = await getToken();
    if (!token) {
        return {
            error: SESSION_EXPIRED_MESSAGE,
            requiresSessionRenewal: true,
        };
    }

    try {
        const data = await actionFn(token);
        return { data };
    } catch (err: unknown) {
        if (isUnauthorizedError(err)) {
            return {
                error: SESSION_EXPIRED_MESSAGE,
                requiresSessionRenewal: true,
            };
        }

        return { error: getErrorMessage(err) };
    }
}

export async function getUsersAction(includeDisabled = true) {
    return withAuthRetry((token) => api.getUsers(token, includeDisabled));
}

type UpdateUserPayload = {
    name?: string;
    dailyBudget?: number;
    currency?: string;
    password?: string;
    isPremium?: boolean;
};

export async function updateUserAction(id: string, payload: UpdateUserPayload) {
    return withAuthRetry((token) => api.updateUser(token, id, payload));
}

export async function disableUserAction(id: string) {
    return withAuthRetry((token) => api.disableUser(token, id));
}

export async function activateUserAction(id: string) {
    return withAuthRetry((token) => api.activateUser(token, id));
}
