import { request } from "./api";
import type { Category, CategoryWritePayload, Expense, ExpenseListResponse, ExpenseWritePayload, Summary } from "@/features/finance/finance.types";

export const userApi = {
  login: (email: string, password: string) => request<{ accessToken: string; refreshToken: string; user: UserAccount }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  google: (token: string) => request<{ accessToken: string; refreshToken: string; user: UserAccount }>("/auth/google", { method: "POST", body: JSON.stringify({ firebaseIdToken: token, existingUserOnly: true }) }),
  me: (token: string) => request<{ user: UserAccount }>("/users/me", { method: "GET" }, token),
  refresh: (token: string) => request<{ accessToken: string; refreshToken: string; user: UserAccount }>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: token }) }),
  logout: (token: string) => request<{ message: string }>("/auth/logout", { method: "POST" }, token),
  summary: (token: string) => request<Summary>("/expenses/today", { method: "GET" }, token),
  expenses: (token: string, query: string) => request<ExpenseListResponse>(`/expenses?${query}`, { method: "GET" }, token),
  expense: (token: string, id: string) => request<Expense>(`/expenses/${id}`, { method: "GET" }, token),
  createExpense: (token: string, body: FormData) => request<Expense>("/expenses", { method: "POST", body }, token),
  updateExpense: (token: string, id: string, body: ExpenseWritePayload) => request<Expense>(`/expenses/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token),
  deleteExpense: (token: string, id: string) => request<unknown>(`/expenses/${id}`, { method: "DELETE" }, token),
  categories: (token: string) => request<Category[]>("/categories", { method: "GET" }, token),
  createCategory: (token: string, body: CategoryWritePayload) => request<Category>("/categories", { method: "POST", body: JSON.stringify(body) }, token),
  updateCategory: (token: string, id: string, body: CategoryWritePayload) => request<Category>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token),
  deleteCategory: (token: string, id: string) => request<unknown>(`/categories/${id}`, { method: "DELETE" }, token),
};

export type UserAccount = { id: string; email: string; name: string; role: string; currency?: string; isActive?: boolean; isPremium?: boolean; avatarUrl?: string | null };
