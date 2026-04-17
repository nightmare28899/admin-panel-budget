export const API_BASE_URL =
    (process.env.NEXT_PUBLIC_API_URL || "https://app.kevinlg.cloud/api").replace(/\/+$/, "");

export type LoginResponse = {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        isActive?: boolean;
        isPremium?: boolean;
    };
};

export type UserRow = {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string | null;
    avatarKey?: string | null;
    currency?: string;
    dailyBudget?: number;
    isActive?: boolean;
    isPremium?: boolean;
    deletedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export type CurrentUserResponse = {
    message: string;
    isAuthenticated: boolean;
    account: {
        isActive: boolean;
        isPremium: boolean;
        isDisabled: boolean;
        deletedAt?: string | null;
    } | null;
    user: UserRow | null;
};

export type SendTestPushResponse = {
    message: string;
    tokenCount: number;
    successCount: number;
    failureCount: number;
    invalidTokensRemoved: number;
    failureReasons?: Record<string, number>;
};

function parseApiErrorMessage(raw: string, status: number): string {
    if (!raw) return `Request failed (${status})`;

    try {
        const parsed = JSON.parse(raw) as { message?: string | string[] };
        const message = parsed?.message;

        if (Array.isArray(message) && message.length > 0) {
            return message.join("\n");
        }

        if (typeof message === "string" && message.trim()) {
            return message;
        }
    } catch {
        // If it's not JSON, fall back to plain text.
    }

    return raw;
}

async function request<T>(
    path: string,
    init: RequestInit = {},
    token?: string,
): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
            ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init.headers ?? {}),
        },
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(parseApiErrorMessage(text, res.status));
    }

    return res.json() as Promise<T>;
}

export const api = {
    login: (email: string, password: string) =>
        request<LoginResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    logout: (token: string) =>
        request<{ message: string }>("/auth/logout", {
            method: "POST",
        }, token),

    getMe: (token: string) =>
        request<CurrentUserResponse>("/users/me", {
            method: "GET",
        }, token),

    getUsers: (token: string, includeDisabled = true) =>
        request<{ users: UserRow[]; count: number; message: string }>(
            `/users?includeDisabled=${includeDisabled}`,
            { method: "GET" },
            token,
        ),

    createUser: (
        token: string,
        payload: {
            email: string;
            name: string;
            password: string;
            role: "admin" | "user";
            dailyBudget?: number;
            currency?: string;
        },
    ) =>
        request<{ message: string; user: UserRow }>(
            "/users",
            {
                method: "POST",
                body: JSON.stringify(payload),
            },
            token,
        ),

    updateUser: (
        token: string,
        id: string,
        payload: {
            name?: string;
            dailyBudget?: number;
            currency?: string;
            password?: string;
            isPremium?: boolean;
        },
    ) =>
        request<{ message: string; user: UserRow }>(
            `/users/${id}`,
            {
                method: "PATCH",
                body: JSON.stringify(payload),
            },
            token,
        ),

    disableUser: (token: string, id: string) =>
        request<{ message: string; user?: UserRow }>(`/users/${id}`, { method: "DELETE" }, token),

    activateUser: (token: string, id: string) =>
        request<{ message: string; user: UserRow }>(
            `/users/${id}`,
            {
                method: "PATCH",
                body: JSON.stringify({ isActive: true }),
            },
            token,
        ),

    refreshToken: (refreshToken: string) =>
        request<LoginResponse>("/auth/refresh", {
            method: "POST",
            body: JSON.stringify({ refreshToken }),
        }),

    sendTestPush: (
        token: string,
        payload: {
            userId: string;
            title: string;
            body: string;
        },
    ) =>
        request<SendTestPushResponse>(
            "/notifications/test-push",
            {
                method: "POST",
                body: JSON.stringify(payload),
            },
            token,
        ),
};
