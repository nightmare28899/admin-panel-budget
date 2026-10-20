import type { ExpenseListResponse } from "../finance.types";

export interface DetectedPurchase {
  id: string;
  fingerprint: string;
  sourcePackage: string;
  amountCents: number;
  currency: string;
  merchant: string | null;
  occurredAtMillis: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  possibleDuplicateOf: string | null;
  mayBeRegistered: boolean;
  status: "PENDING" | "CONFIRMED" | "DISCARDED";
  expenseId: string | null;
  statementPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DetectedPurchaseListResponse {
  purchases: DetectedPurchase[];
  pagination: ExpenseListResponse["pagination"];
}

export interface ConfirmAsPaymentPayload {
  cardId: string;
  amount: number;
  paidAt: string;
  note?: string;
}
