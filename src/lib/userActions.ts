"use server";

import type {
  CategoryWritePayload,
  Expense,
  ExpenseWritePayload,
} from "@/features/finance/finance.types";
import type { CreditCardWritePayload } from "@/features/finance/credit-cards.types";
import {
  buildTestDataFixtures,
  TEST_DATA_MARKER,
} from "@/features/finance/testDataFixtures";
import type {
  ConfirmStatementImportPayload,
  MarkStatementImportPaidPayload,
  UpdateStatementRowsPayload,
} from "@/features/finance/statement-import.types";
import type {
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
} from "@/features/finance/subscriptions.types";
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

export type SeedTestDataSummary = {
  created: number;
  skipped: number;
  failed: number;
};

// "requestFailedGeneric" is a stable i18n message key (see
// src/i18n/messages.ts) — this file can't call t() itself, so UI call sites
// resolve it via frontendError()/t() before displaying it.
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "requestFailedGeneric";

const isUnauthorizedError = (error: unknown) => {
  const message = errorText(error);
  return message.includes("401") || message.toLowerCase().includes("unauthorized");
};

function testDataGenerationEnabled() {
  if (process.env.TEST_DATA_ENABLED !== "true") return false;

  try {
    const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "");
    return (
      apiUrl.protocol === "http:" &&
      ["host.docker.internal", "localhost", "127.0.0.1"].includes(
        apiUrl.hostname,
      ) &&
      apiUrl.pathname.replace(/\/$/, "") === "/api"
    );
  } catch {
    return false;
  }
}

function addExpenseFields(form: FormData, body: ExpenseWritePayload) {
  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined && value !== "") form.append(key, value);
  });
}

async function getAllExpensesForTestData(token: string): Promise<Expense[]> {
  const expenses: Expense[] = [];
  let page = 1;

  for (let requestCount = 0; requestCount < 20; requestCount += 1) {
    const query = new URLSearchParams({ page: String(page), limit: "100" });
    const response = await userApi.expenses(token, query.toString());
    expenses.push(...response.expenses);
    if (!response.pagination.hasNext) return expenses;
    page += 1;
  }

  throw new Error("testDataExpenseReadLimit");
}

async function seedTestData(token: string): Promise<SeedTestDataSummary> {
  const fixtures = buildTestDataFixtures();
  const summary: SeedTestDataSummary = { created: 0, skipped: 0, failed: 0 };
  const [existingCategories, cardOverview, existingExpenses] = await Promise.all([
    userApi.categories(token),
    userApi.creditCardsOverview(token, "includeInactive=true"),
    getAllExpensesForTestData(token),
  ]);
  const categoriesByName = new Map(
    existingCategories.map((category) => [category.name, category]),
  );

  for (const fixture of fixtures.categories) {
    if (categoriesByName.has(fixture.payload.name)) {
      summary.skipped += 1;
      continue;
    }

    try {
      const category = await userApi.createCategory(token, fixture.payload);
      categoriesByName.set(category.name, category);
      summary.created += 1;
    } catch (error) {
      if (isUnauthorizedError(error)) throw error;
      summary.failed += 1;
    }
  }

  for (const fixture of fixtures.cards) {
    const exists = cardOverview.cards.some(
      (card) =>
        card.name === fixture.payload.name &&
        card.last4 === fixture.payload.last4,
    );
    if (exists) {
      summary.skipped += 1;
      continue;
    }

    try {
      await userApi.createCreditCard(token, fixture.payload);
      summary.created += 1;
    } catch (error) {
      if (isUnauthorizedError(error)) throw error;
      summary.failed += 1;
    }
  }

  const existingExpenseMarkers = new Set(
    existingExpenses
      .map((expense) => expense.note)
      .filter(
        (note): note is string =>
          typeof note === "string" && note.startsWith(`${TEST_DATA_MARKER}:`),
      ),
  );

  for (const fixture of fixtures.expenses) {
    if (existingExpenseMarkers.has(fixture.marker)) {
      summary.skipped += 1;
      continue;
    }

    const category = fixtures.categories.find(
      (candidate) => candidate.key === fixture.categoryKey,
    );
    const categoryId = category
      ? categoriesByName.get(category.payload.name)?.id
      : undefined;
    if (!categoryId) {
      summary.failed += 1;
      continue;
    }

    try {
      const form = new FormData();
      addExpenseFields(form, { ...fixture.payload, categoryId });
      await userApi.createExpense(token, form);
      summary.created += 1;
    } catch (error) {
      if (isUnauthorizedError(error)) throw error;
      summary.failed += 1;
    }
  }

  return summary;
}

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
      error: "userGoogleSignInUnavailable",
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

// Server Components render can't write cookies, so this variant skips the
// refresh-on-401 retry (which would call setUserSession -> cookies().set()).
// Use this only from Server Components (e.g. layout guards); client
// components should keep using getUserMeAction for the refresh behavior.
export async function getUserMeForLayoutAction() {
  return withUser((token) => userApi.me(token), false);
}

export async function getFinanceSummaryAction() {
  return withUser((token) => userApi.summary(token), true);
}

export async function seedTestDataAction(): Promise<
  Result<SeedTestDataSummary>
> {
  if (!testDataGenerationEnabled()) return { error: "testDataDisabled" };
  return withFreshUser((token) => seedTestData(token));
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

export async function getCreditCardsAction() {
  return withUser((token) => userApi.creditCards(token), true);
}

export async function getCreditCardsOverviewAction(query: string) {
  return withUser((token) => userApi.creditCardsOverview(token, query), true);
}

export async function createCreditCardAction(body: CreditCardWritePayload) {
  return withFreshUser((token) => userApi.createCreditCard(token, body));
}

export async function updateCreditCardAction(
  id: string,
  body: Partial<CreditCardWritePayload> & { isActive?: boolean },
) {
  return withFreshUser((token) => userApi.updateCreditCard(token, id, body));
}

export async function deactivateCreditCardAction(id: string) {
  return withFreshUser((token) => userApi.deactivateCreditCard(token, id));
}

export async function getStatementImportsAction(query: string) {
  return withUser((token) => userApi.statementImports(token, query), true);
}

export async function getStatementImportAction(id: string) {
  return withUser((token) => userApi.statementImport(token, id), true);
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

export async function createStatementImportAction(
  file: File,
  creditCardId?: string,
) {
  return withFreshUser((token) => {
    const form = new FormData();
    form.append("file", file, file.name);
    if (creditCardId) form.append("creditCardId", creditCardId);
    return userApi.createStatementImport(token, form);
  });
}

export async function processStatementImportAction(id: string) {
  return withFreshUser((token) => userApi.processStatementImport(token, id));
}

export async function updateStatementRowsAction(
  id: string,
  body: UpdateStatementRowsPayload,
) {
  return withFreshUser((token) => userApi.updateStatementRows(token, id, body));
}

export async function confirmStatementImportAction(
  id: string,
  body: ConfirmStatementImportPayload,
) {
  return withFreshUser((token) => userApi.confirmStatementImport(token, id, body));
}

export async function revertStatementImportAction(
  id: string,
  body: ConfirmStatementImportPayload,
) {
  return withFreshUser((token) => userApi.revertStatementImport(token, id, body));
}

export async function markStatementImportPaidAction(
  id: string,
  isPaid: boolean,
) {
  return withFreshUser((token) =>
    userApi.markStatementImportPaid(token, id, { isPaid } satisfies MarkStatementImportPaidPayload),
  );
}

export async function deleteStatementImportAction(id: string) {
  return withFreshUser((token) => userApi.deleteStatementImport(token, id));
}

export async function updateExpenseAction(
  id: string,
  body: ExpenseWritePayload,
) {
  return withFreshUser((token) => userApi.updateExpense(token, id, body));
}

export async function getSubscriptionsAction() {
  return withUser((token) => userApi.listSubscriptions(token), true);
}

export async function createSubscriptionAction(body: CreateSubscriptionPayload) {
  return withFreshUser((token) => userApi.createSubscription(token, body));
}

export async function updateSubscriptionAction(
  id: string,
  body: UpdateSubscriptionPayload,
) {
  return withFreshUser((token) => userApi.updateSubscription(token, id, body));
}

export async function deactivateSubscriptionAction(id: string) {
  return withFreshUser((token) => userApi.deactivateSubscription(token, id));
}

export async function createExpenseAction(
  body: ExpenseWritePayload,
  receipt?: File,
): Promise<Result<unknown>> {
  return withFreshUser(async (token) => {
    const form = new FormData();
    addExpenseFields(form, body);
    if (receipt) form.append("image", receipt, receipt.name);
    return userApi.createExpense(token, form);
  });
}
