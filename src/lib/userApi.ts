import type { DetectedPurchase, DetectedPurchaseListResponse } from "@/features/finance/interfaces/detected-purchases";
import { API_BASE_URL, request } from "./api";
import type { BudgetWritePayload, CardExpenseBreakdownResponse, Category, CategoryWritePayload, Expense, ExpenseListResponse, ExpenseWritePayload, Summary } from "@/features/finance/finance.types";
import type {
  CreditCardOverviewResponse,
  CreditCardWritePayload,
  DeleteCreditCardPermanentlyResponse,
} from "@/features/finance/credit-cards.types";
import type {
  CreditCardSummary,
  ConfirmStatementImportPayload,
  ConfirmStatementImportResponse,
  DeleteStatementImportResponse,
  CorrectStatementPaymentPayload,
  RevertStatementImportResponse,
  StatementImportCreateResponse,
  StatementImportDetail,
  StatementImportListResponse,
  UpdateStatementRowsPayload,
  StatementPaymentMutationResponse,
  StatementPaymentWritePayload,
  VoidStatementPaymentPayload,
} from "@/features/finance/statement-import.types";
import type {
  CreateSubscriptionPayload,
  Subscription,
  UpdateSubscriptionPayload,
} from "@/features/finance/subscriptions.types";

/** Nutrition endpoints take the same user bearer token as Personal Finance. */
const nutritionApi = {
  nutritionState: (token: string) => request<unknown>("/nutrition/state", { method: "GET" }, token),
  nutritionCommand: (token: string, command: string, payload: unknown) =>
    request<{ ok: true }>("/nutrition/commands", { method: "POST", body: JSON.stringify({ command, payload }) }, token),
  uploadNutritionOriginal: (token: string, dietId: string, file: File) => {
    const body = new FormData();
    body.set("file", file, file.name);
    return request<{ ok: true; id: string }>(`/nutrition/diets/${encodeURIComponent(dietId)}/original`, { method: "POST", body }, token);
  },
  /** Extracts a DRAFT diet from 1-3 photos or one PDF. Nothing is persisted by the backend. */
  importNutritionDiet: (token: string, files: File[]) => {
    const body = new FormData();
    for (const file of files) body.append("files", file, file.name);
    return request<unknown>("/nutrition/diet-imports", { method: "POST", body }, token);
  },
  /** Generates AI recipe drafts for one diet option. Nothing is persisted by the backend. */
  suggestNutritionRecipes: (
    token: string,
    body: { optionId: string; count?: number; preferences?: string },
  ) =>
    request<unknown>(
      "/nutrition/recipe-suggestions",
      { method: "POST", body: JSON.stringify(body) },
      token,
    ),
  /** Raw Response so callers can stream the bytes and copy headers; check `ok` yourself. */
  downloadNutritionFile: (token: string, id: string): Promise<Response> =>
    fetch(`${API_BASE_URL}/nutrition/files/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
};

export const userApi = {
  ...nutritionApi,
  detectedPurchases: (token: string, query: string) =>
    request<DetectedPurchaseListResponse>(`/detected-purchases?${query}`, { method: "GET" }, token),
  confirmDetectedPurchase: (token: string, id: string, expense: ExpenseWritePayload) =>
    request<DetectedPurchase>(`/detected-purchases/${encodeURIComponent(id)}/confirm`, { method: "POST", body: JSON.stringify({ expense }) }, token),
  discardDetectedPurchase: (token: string, id: string) =>
    request<DetectedPurchase>(`/detected-purchases/${encodeURIComponent(id)}/discard`, { method: "POST", body: JSON.stringify({}) }, token),
  login: (email: string, password: string) => request<{ accessToken: string; refreshToken: string; user: UserAccount }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  // existingUserOnly=false registers a new account for an unknown Google email.
  google: (token: string, options: { existingUserOnly?: boolean } = {}) => request<{ accessToken: string; refreshToken: string; user: UserAccount }>("/auth/google", { method: "POST", body: JSON.stringify({ firebaseIdToken: token, existingUserOnly: options.existingUserOnly ?? false }) }),
  me: (token: string) => request<{ user: UserAccount }>("/users/me", { method: "GET" }, token),
  refresh: (token: string) => request<{ accessToken: string; refreshToken: string; user: UserAccount }>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: token }) }),
  logout: (token: string) => request<{ message: string }>("/auth/logout", { method: "POST" }, token),
  updateBudget: (token: string, body: BudgetWritePayload) => request<{ user: UserAccount }>("/users/me", { method: "PATCH", body: JSON.stringify(body) }, token),
  summary: (token: string) => request<Summary>("/expenses/today", { method: "GET" }, token),
  expenses: (token: string, query: string) => request<ExpenseListResponse>(`/expenses?${query}`, { method: "GET" }, token),
  expense: (token: string, id: string) => request<Expense>(`/expenses/${id}`, { method: "GET" }, token),
  cardExpenseBreakdown: (token: string, query: string) =>
    request<CardExpenseBreakdownResponse>(`/analytics/cards?${query}`, { method: "GET" }, token),
  createExpense: (token: string, body: FormData) => request<Expense>("/expenses", { method: "POST", body }, token),
  updateExpense: (token: string, id: string, body: ExpenseWritePayload) => request<Expense>(`/expenses/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token),
  deleteExpense: (token: string, id: string) => request<unknown>(`/expenses/${id}`, { method: "DELETE" }, token),
  categories: (token: string) => request<Category[]>("/categories", { method: "GET" }, token),
  createCategory: (token: string, body: CategoryWritePayload) => request<Category>("/categories", { method: "POST", body: JSON.stringify(body) }, token),
  updateCategory: (token: string, id: string, body: CategoryWritePayload) => request<Category>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token),
  deleteCategory: (token: string, id: string) => request<unknown>(`/categories/${id}`, { method: "DELETE" }, token),
  creditCards: (token: string) => request<CreditCardSummary[]>("/credit-cards", { method: "GET" }, token),
  creditCardsOverview: (token: string, query: string) =>
    request<CreditCardOverviewResponse>(`/credit-cards/overview?${query}`, { method: "GET" }, token),
  createCreditCard: (token: string, body: CreditCardWritePayload) =>
    request<CreditCardSummary>("/credit-cards", { method: "POST", body: JSON.stringify(body) }, token),
  updateCreditCard: (token: string, id: string, body: Partial<CreditCardWritePayload> & { isActive?: boolean }) =>
    request<CreditCardSummary>(`/credit-cards/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token),
  deactivateCreditCard: (token: string, id: string) =>
    request<unknown>(`/credit-cards/${id}`, { method: "DELETE" }, token),
  deleteCreditCardPermanently: (token: string, id: string) =>
    request<DeleteCreditCardPermanentlyResponse>(`/credit-cards/${id}/permanent`, { method: "DELETE" }, token),
  statementImports: (token: string, query: string) =>
    request<StatementImportListResponse>(`/statement-imports?${query}`, { method: "GET" }, token),
  statementImport: (token: string, id: string) =>
    request<StatementImportDetail>(`/statement-imports/${id}`, { method: "GET" }, token),
  createStatementImport: (token: string, body: FormData) =>
    request<StatementImportCreateResponse>("/statement-imports", { method: "POST", body }, token),
  processStatementImport: (token: string, id: string) =>
    request<StatementImportDetail>(`/statement-imports/${id}/process`, { method: "POST" }, token),
  updateStatementRows: (token: string, id: string, body: UpdateStatementRowsPayload) =>
    request<StatementImportDetail>(`/statement-imports/${id}/rows`, { method: "PATCH", body: JSON.stringify(body) }, token),
  confirmStatementImport: (token: string, id: string, body: ConfirmStatementImportPayload) =>
    request<ConfirmStatementImportResponse>(`/statement-imports/${id}/confirm`, { method: "POST", body: JSON.stringify(body) }, token),
  revertStatementImport: (token: string, id: string, body: ConfirmStatementImportPayload) =>
    request<RevertStatementImportResponse>(`/statement-imports/${id}/revert`, { method: "POST", body: JSON.stringify(body) }, token),
  resumeStatementImport: (token: string, id: string, body: ConfirmStatementImportPayload) =>
    request<StatementImportDetail>(`/statement-imports/${id}/resume`, { method: "POST", body: JSON.stringify(body) }, token),
  createStatementPayment: (token: string, id: string, body: StatementPaymentWritePayload) =>
    request<StatementPaymentMutationResponse>(`/statement-imports/${id}/payments`, { method: "POST", body: JSON.stringify(body) }, token),
  correctStatementPayment: (token: string, id: string, body: CorrectStatementPaymentPayload) =>
    request<StatementPaymentMutationResponse>(`/statement-payments/${id}/corrections`, { method: "POST", body: JSON.stringify(body) }, token),
  voidStatementPayment: (token: string, id: string, body: VoidStatementPaymentPayload) =>
    request<StatementPaymentMutationResponse>(`/statement-payments/${id}/void`, { method: "POST", body: JSON.stringify(body) }, token),
  deleteStatementImport: (token: string, id: string) =>
    request<DeleteStatementImportResponse>(`/statement-imports/${id}`, { method: "DELETE" }, token),
  listSubscriptions: (token: string) =>
    request<Subscription[]>("/subscriptions", { method: "GET" }, token),
  getSubscription: (token: string, id: string) =>
    request<Subscription>(`/subscriptions/${id}`, { method: "GET" }, token),
  createSubscription: (token: string, body: CreateSubscriptionPayload) =>
    request<Subscription>("/subscriptions", { method: "POST", body: JSON.stringify(body) }, token),
  updateSubscription: (token: string, id: string, body: UpdateSubscriptionPayload) =>
    request<Subscription>(`/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token),
  deactivateSubscription: (token: string, id: string) =>
    request<{ message: string; subscription: Subscription }>(`/subscriptions/${id}`, { method: "DELETE" }, token),
  deleteSubscriptionPermanently: (token: string, id: string) =>
    request<{ message: string }>(`/subscriptions/${id}/permanent`, { method: "DELETE" }, token),
  linkExpensesToSubscription: (token: string, id: string, expenseIds: string[]) =>
    request<{ message: string; linkedCount: number }>(`/subscriptions/${id}/link-expenses`, { method: "POST", body: JSON.stringify({ expenseIds }) }, token),
  unlinkExpensesFromSubscription: (token: string, id: string, expenseIds: string[]) =>
    request<{ message: string; unlinkedCount: number }>(`/subscriptions/${id}/unlink-expenses`, { method: "POST", body: JSON.stringify({ expenseIds }) }, token),
};

export type UserAccount = { id: string; email: string; name: string; role: string; currency?: string; isActive?: boolean; isPremium?: boolean; avatarUrl?: string | null };
