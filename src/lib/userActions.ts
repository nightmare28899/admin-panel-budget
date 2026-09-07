"use server";

import type {
  CategoryWritePayload,
  ExpenseWritePayload,
} from "@/features/finance/finance.types";
import { userApi } from "./userApi";
import {
  clearUserSession,
  getUserRefreshToken,
  getUserToken,
  setUserSession,
  USER_SESSION_EXPIRED,
  userGoogleAuthEnabled,
} from "./userSession";

type Result<T = undefined> = {
  data?: T;
  error?: string;
  sessionExpired?: boolean;
};

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Request failed";

export async function userLoginAction(
  email: string,
  password: string,
): Promise<Result> {
  try {
    await setUserSession(await userApi.login(email, password));
    return {};
  } catch (error) {
    return { error: errorText(error) };
  }
}

export async function userGoogleLoginAction(
  firebaseToken: string,
): Promise<Result> {
  if (!userGoogleAuthEnabled()) {
    return {
      error:
        "Google sign-in is unavailable until server-side Firebase authentication is enabled.",
    };
  }

  try {
    await setUserSession(await userApi.google(firebaseToken));
    return {};
  } catch (error) {
    return { error: errorText(error) };
  }
}

export async function userLogoutAction(): Promise<Result> {
  const token = await getUserToken();

  if (token) {
    try {
      await userApi.logout(token);
    } catch {
      // Cookie clearing remains authoritative.
    }
  }

  await clearUserSession();
  return {};
}

async function refreshUserSession() {
  const refreshToken = await getUserRefreshToken();
  if (!refreshToken) return false;

  try {
    await setUserSession(await userApi.refresh(refreshToken));
    return true;
  } catch {
    await clearUserSession();
    return false;
  }
}

async function withUser<T>(
  operation: (token: string) => Promise<T>,
  retryAfterRefresh = false,
): Promise<Result<T>> {
  const token = await getUserToken();
  if (!token) return { error: USER_SESSION_EXPIRED, sessionExpired: true };

  try {
    return { data: await operation(token) };
  } catch (error) {
    const message = errorText(error);
    const unauthorized =
      message.includes("401") || message.toLowerCase().includes("unauthorized");

    if (retryAfterRefresh && unauthorized && (await refreshUserSession())) {
      const nextToken = await getUserToken();
      if (nextToken) {
        try {
          return { data: await operation(nextToken) };
        } catch {
          // Return session-expired state below without exposing response details.
        }
      }
    }

    return unauthorized
      ? { error: USER_SESSION_EXPIRED, sessionExpired: true }
      : { error: message };
  }
}

export async function getUserMeAction() {
  return withUser((token) => userApi.me(token), true);
}

export async function getFinanceSummaryAction() {
  return withUser((token) => userApi.summary(token), true);
}

export async function getExpensesAction(query: string) {
  return withUser((token) => userApi.expenses(token, query), true);
}

export async function getExpenseAction(id: string) {
  return withUser((token) => userApi.expense(token, id), true);
}

export async function getCategoriesAction() {
  return withUser((token) => userApi.categories(token), true);
}

async function withFreshUser<T>(
  operation: (token: string) => Promise<T>,
): Promise<Result<T>> {
  const profile = await getUserMeAction();
  if (profile.error) {
    return { error: profile.error, sessionExpired: profile.sessionExpired };
  }

  const token = await getUserToken();
  return token
    ? withUser(operation)
    : { error: USER_SESSION_EXPIRED, sessionExpired: true };
}

export async function deleteExpenseAction(id: string) {
  return withFreshUser((token) => userApi.deleteExpense(token, id));
}

export async function deleteCategoryAction(id: string) {
  return withFreshUser((token) => userApi.deleteCategory(token, id));
}

export async function updateCategoryAction(
  id: string,
  body: CategoryWritePayload,
) {
  return withFreshUser((token) => userApi.updateCategory(token, id, body));
}

export async function createCategoryAction(body: CategoryWritePayload) {
  return withFreshUser((token) => userApi.createCategory(token, body));
}

export async function updateExpenseAction(
  id: string,
  body: ExpenseWritePayload,
) {
  return withFreshUser((token) => userApi.updateExpense(token, id, body));
}

export async function createExpenseAction(
  body: ExpenseWritePayload,
  receipt?: File,
): Promise<Result<unknown>> {
  return withFreshUser(async (token) => {
    const form = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== "") form.append(key, value);
    });
    if (receipt) form.append("image", receipt, receipt.name);
    return userApi.createExpense(token, form);
  });
}
