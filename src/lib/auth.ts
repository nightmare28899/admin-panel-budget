"use client";

const TOKEN_KEY = "admin_token";
const USER_KEY = "admin_user";

export function saveAuth(token: string, user: object) {
localStorage.setItem(TOKEN_KEY, token);
localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getToken() {
if (typeof window === "undefined") return null;
return localStorage.getItem(TOKEN_KEY);
}
export function getUser<T>() {
if (typeof window === "undefined") return null;
const value = localStorage.getItem(USER_KEY);
if (!value) return null;
try { return JSON.parse(value) as T; } catch { return null; }
}
export function clearAuth() {
if (typeof window === "undefined") return;
localStorage.removeItem(TOKEN_KEY);
localStorage.removeItem(USER_KEY);
}
