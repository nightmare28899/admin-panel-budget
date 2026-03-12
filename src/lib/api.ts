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
    deletedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

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
        throw new Error(text || `Request failed (${res.status})`);
    }

    return res.json() as Promise<T>;
}

export const api = {
    login: (email: string, password: string) =>
        request<LoginResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

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

    refreshToken: (refreshToken: string) =>
        request<LoginResponse>("/auth/refresh", {
            method: "POST",
            body: JSON.stringify({ refreshToken }),
        }),
};
