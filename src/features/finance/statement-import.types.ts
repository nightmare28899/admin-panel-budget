import type { Category } from "./finance.types";

export type StatementImportStatus =
  | "UPLOADED"
  | "PARSED"
  | "NEEDS_REVIEW"
  | "CONFIRMED"
  | "REVERTED"
  | "FAILED";

export type StatementSourceFormat = "PDF";
export type StatementSection =
  | "RECONCILIATION"
  | "PAYMENT_TARGET"
  | "CURRENT_CHARGES"
  | "FINANCING_PLAN"
  | "CFDI"
  | "OTHER";
export type StatementRowKind =
  | "CHARGE"
  | "PAYMENT"
  | "CREDIT"
  | "INTEREST"
  | "TAX"
  | "REFINANCED_PRINCIPAL"
  | "CFDI"
  | "UNKNOWN";
export type StatementRowDecision =
  | "PENDING"
  | "INCLUDE_EXPENSE"
  | "EXCLUDE"
  | "INFO_ONLY";
export type StatementReconciliationStatus = "PENDING" | "PASSED" | "FAILED";
export type StatementInstrumentKind = "PHYSICAL" | "DIGITAL" | "UNKNOWN";
export type StatementFinancingType = "NO_INTEREST" | "INTEREST_BEARING" | "REFINANCED";
export type StatementPaymentTargetKind =
  | "MINIMUM"
  | "MINIMUM_PLUS_INSTALLMENTS"
  | "NO_INTEREST"
  | "OTHER";

export type MoneyValue = number | string;
export type StatementPaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type StatementPaymentSource = "MANUAL" | "LEGACY_BACKFILL" | "CORRECTION";

export type StatementPaymentIntegrityFlags = {
  missingReconciliation: boolean;
  failedReconciliation: boolean;
  missingPaymentBasis: boolean;
  conflictingNoInterestTargets: boolean;
};

export type StatementPaymentSummary = {
  currency: string | null;
  closingBalance: number | null;
  paidTotal: number;
  paymentStatus: StatementPaymentStatus;
  isPaid: boolean;
  remainingStatement: number | null;
  noInterestTarget: number | null;
  remainingNoInterest: number | null;
  currentPaymentDue: number | null;
  dueDate: string | null;
  overpaid: number;
  integrityFlags: StatementPaymentIntegrityFlags;
};

export type StatementPayment = {
  id: string;
  amount: MoneyValue;
  currency: string;
  paidAt: string;
  note?: string | null;
  source: StatementPaymentSource;
  supersedesId?: string | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  createdAt: string;
};

export type CreditCardSummary = {
  id: string;
  name: string;
  bank: string;
  brand: string;
  last4: string;
  currency: string;
  color?: string | null;
  creditLimit?: MoneyValue | null;
  closingDay?: number | null;
  paymentDueDay?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LinkedCreditCardSummary = Pick<
  CreditCardSummary,
  "id" | "name" | "bank" | "last4"
> & {
  brand?: string;
};

export type StatementImportListItem = {
  id: string;
  creditCardId?: string | null;
  sourceFileName?: string | null;
  sourceFormat: StatementSourceFormat;
  status: StatementImportStatus;
  periodStart?: string | null;
  periodEnd?: string | null;
  version: number;
  warningCount: number;
  parsedAt?: string | null;
  confirmedAt?: string | null;
  revertedAt?: string | null;
  isPaid: boolean;
  paidAt?: string | null;
  paidAmount?: MoneyValue | null;
  paymentStatus: StatementPaymentStatus;
  paymentVersion: number;
  paymentSummary: StatementPaymentSummary;
  reconciliation?: { closingBalance: MoneyValue; currency: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type StatementImportListResponse = {
  items: StatementImportListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type StatementImportCreateResponse = {
  id: string;
  status: StatementImportStatus;
  version: number;
  warningCount: number;
  failureCode?: string | null;
  failureMessage?: string | null;
  duplicate: boolean;
};

export type StatementReconciliation = {
  currency: string;
  openingBalance: MoneyValue;
  chargesTotal: MoneyValue;
  paymentsTotal: MoneyValue;
  creditsTotal: MoneyValue;
  closingBalance: MoneyValue;
  difference: MoneyValue;
  status: StatementReconciliationStatus;
  message?: string | null;
};

export type StatementPaymentTarget = {
  id: string;
  kind: StatementPaymentTargetKind;
  label: string;
  amount: MoneyValue;
  currency: string;
  dueDate?: string | null;
  sourceRowNumber?: number | null;
  position: number;
};

export type StatementInstrument = {
  id: string;
  label: string;
  kind: StatementInstrumentKind;
  last4?: string | null;
  linkedCreditCardId?: string | null;
  linkedCreditCard?: LinkedCreditCardSummary | null;
  position: number;
};

export type StatementFinancingPlan = {
  id: string;
  type: StatementFinancingType;
  merchantName?: string | null;
  purchaseDate?: string | null;
  originalAmount?: MoneyValue | null;
  installmentAmount?: MoneyValue | null;
  installmentNumber?: number | null;
  installmentCount?: number | null;
  remainingAmount?: MoneyValue | null;
  currency: string;
  sourceRowNumber?: number | null;
  position: number;
};

export type StatementRow = {
  id: string;
  occurrenceKey: string;
  section: StatementSection;
  sourceRowNumber?: number | null;
  position: number;
  transactionDate?: string | null;
  description: string;
  merchantName?: string | null;
  amount: MoneyValue;
  currency: string;
  kind: StatementRowKind;
  parsedTransactionDate?: string | null;
  parsedAmount: MoneyValue;
  parsedCurrency: string;
  parsedKind: StatementRowKind;
  isAdjusted: boolean;
  decision: StatementRowDecision;
  categoryId?: string | null;
  linkedCreditCardId?: string | null;
  warningCodes?: string[] | null;
  decisionNote?: string | null;
  category?: Category | null;
  linkedCreditCard?: LinkedCreditCardSummary | null;
  expense?: { id: string } | null;
};

export type StatementImportDetail = StatementImportListItem & {
  sourceMimeType: string;
  sourceSizeBytes: number;
  parserVersion?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  sourceStored: boolean;
  creditCard?: CreditCardSummary | null;
  reconciliation?: StatementReconciliation | null;
  paymentTargets: StatementPaymentTarget[];
  instruments: StatementInstrument[];
  financingPlans: StatementFinancingPlan[];
  rows: StatementRow[];
  adjustmentCount: number;
  paymentHistory: StatementPayment[];
};

export type UpdateStatementRowPayload = {
  id: string;
  decision?: StatementRowDecision;
  kind?: StatementRowKind;
  transactionDate?: string;
  description?: string;
  merchantName?: string | null;
  amount?: number;
  currency?: string;
  categoryId?: string | null;
  linkedCreditCardId?: string | null;
  decisionNote?: string | null;
};

export type UpdateStatementRowsPayload = {
  version: number;
  rows: UpdateStatementRowPayload[];
};

export type ConfirmStatementImportPayload = {
  version: number;
};

export type ConfirmStatementImportResponse = {
  import: StatementImportDetail;
  createdExpenseCount: number;
  alreadyConfirmed: boolean;
  sourceDeletionPending: boolean;
};

export type RevertStatementImportResponse = {
  import: StatementImportDetail;
  deletedExpenseCount: number;
  alreadyReverted: boolean;
};

export type StatementPaymentWritePayload = {
  amount: number;
  currency: string;
  paidAt: string;
  note?: string;
  expectedVersion: number;
  idempotencyKey: string;
};

export type CorrectStatementPaymentPayload = StatementPaymentWritePayload & {
  reason: string;
};

export type VoidStatementPaymentPayload = {
  expectedVersion: number;
  reason: string;
};

export type StatementPaymentMutationResponse = {
  paymentVersion: number;
  summary: StatementPaymentSummary;
  history: StatementPayment[];
};

export type DeleteStatementImportResponse = {
  message: string;
};
