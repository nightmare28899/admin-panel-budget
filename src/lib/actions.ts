"use server";

import { cookies } from "next/headers";
import { api } from "./api";

const TOKEN_KEY = "admin_token";
const REFRESH_KEY = "admin_refresh_token";
const USER_KEY = "admin_user";

export async function loginAction(email: string, password: string) {
    try {
        const res = await api.login(email, password);

        if ((res.user?.role || "").toLowerCase() !== "admin") {
            return { error: "Access denied. Only ADMIN users can access this platform." };
        }

        const cookieStore = await cookies();

        cookieStore.set(TOKEN_KEY, res.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        cookieStore.set(REFRESH_KEY, res.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        cookieStore.set(USER_KEY, JSON.stringify(res.user), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        return { success: true };
    } catch (err) {
        return { error: err instanceof Error ? err.message : "Login failed" };
    }
}

export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete(TOKEN_KEY);
    cookieStore.delete(REFRESH_KEY);
    cookieStore.delete(USER_KEY);
    return { success: true };
}

async function getToken() {
    const cookieStore = await cookies();
    return cookieStore.get(TOKEN_KEY)?.value;
}

async function getRefreshToken() {
    const cookieStore = await cookies();
    return cookieStore.get(REFRESH_KEY)?.value;
}

async function withAuthRetry<T>(actionFn: (token: string) => Promise<T>): Promise<{ data?: T; error?: string }> {
    let token = await getToken();
    if (!token) return { error: "Unauthorized" };

    try {
        const data = await actionFn(token);
        return { data };
    } catch (err: any) {
        // Assume 401 means the token is expired/invalid
        if (err.message && err.message.includes("401")) {
            console.log("[Auth] Token expired, attempting to refresh...");
            const refreshToken = await getRefreshToken();

            if (!refreshToken) {
                await logoutAction();
                return { error: "Session expired. Please log in again." };
            }

            try {
                const refreshed = await api.refreshToken(refreshToken);
                const cookieStore = await cookies();
                
                cookieStore.set(TOKEN_KEY, refreshed.accessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                    maxAge: 60 * 60 * 24 * 7,
                });
                
                cookieStore.set(REFRESH_KEY, refreshed.refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                    maxAge: 60 * 60 * 24 * 7,
                });

                console.log("[Auth] Token refresh successful. Retrying action.");
                const data = await actionFn(refreshed.accessToken);
                return { data };
            } catch (refreshErr) {
                console.log("[Auth] Token refresh failed. Logging out.");
                await logoutAction();
                return { error: "Session expired. Please log in again." };
            }
        }

        return { error: err.message || "Action failed" };
    }
}

export async function getUsersAction(includeDisabled = true) {
    return withAuthRetry((token) => api.getUsers(token, includeDisabled));
}

export async function updateUserAction(id: string, payload: any) {
    return withAuthRetry((token) => api.updateUser(token, id, payload));
}

export async function disableUserAction(id: string) {
    return withAuthRetry((token) => api.disableUser(token, id));
}
