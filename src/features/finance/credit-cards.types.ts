export type CreditCardWritePayload = {
  name: string;
  bank: string;
  brand: string;
  last4: string;
  currency: string;
  color?: string;
  creditLimit?: number;
  closingDay?: number;
  paymentDueDay?: number;
};

export type CreditCardCycle = {
  currency: string;
  start: string;
  end: string;
  spend: number;
  expenseCount: number;
  currencyMismatchCount: number;
};

export type CreditCardStatus = {
  currency: string;
  limit: number | null;
  availableCredit: number | null;
  utilizationPercent: number | null;
  owedBalance: number;
};

export type CreditCardNextPayment = {
  currency: string;
  amount: number;
  dueDate: string | null;
  previousAmount: number | null;
};

export type CreditCardStatementSummary = {
  statementImportId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  closingBalance: number | null;
  paidTotal: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  remainingStatement: number;
  deferredInstallmentBalance: number;
  noInterestTarget: number | null;
  currentPaymentDue: number | null;
  /** MINIMUM payment target of the latest statement, same currency as the card. */
  minimumPayment: number | null;
  dueDate: string | null;
  /**
   * True when a newer cycle closed without an uploaded statement (the latest
   * statement is paid and does not cover the last closing). Optional for
   * older API responses.
   */
  needsNewStatement?: boolean;
  /** Inverse of `needsNewStatement`. */
  coversCurrentCycle?: boolean;
  postCloseSpend: number;
  postCloseExpenseCount: number;
  projectedNextCloseDate: string | null;
  projectedNextCloseAmount: number;
  projectedTotalDebt: number;
  nextPlanInstallments: number;
  nextClosePaymentEstimate: number;
  estimatedRemainingAfterNextClose: number;
  overpaid: number;
  integrityFlags: {
    missingReconciliation: boolean;
    failedReconciliation: boolean;
    missingPaymentBasis: boolean;
    conflictingNoInterestTargets: boolean;
  };
};

export type CreditCardSchedule = {
  nextClosingDate: string | null;
  daysUntilClosing: number | null;
  nextPaymentDueDate: string | null;
  daysUntilPaymentDue: number | null;
};

export type CreditCardSubscriptionsSummary = {
  currency: string;
  activeCount: number;
  monthlyRecurringSpend: number;
  nextChargeDate: string | null;
  currencyMismatchCount: number;
};

export type CreditCardFlags = {
  missingLimit: boolean;
  highUtilization: boolean;
  overLimit: boolean;
  paymentDueSoon: boolean;
  closingSoon: boolean;
  currencyMismatch: boolean;
};

export type CreditCardInstallmentPlan = {
  id: string;
  type: "NO_INTEREST" | "INTEREST_BEARING" | "REFINANCED";
  merchantName: string | null;
  purchaseDate: string | null;
  originalAmount: number | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  installmentAmount: number | null;
  remainingAmount: number | null;
  currency: string;
  statementPeriodEnd: string | null;
  isFinalInstallment: boolean;
};

export type CreditCardOverviewItem = {
  installmentPlans?: CreditCardInstallmentPlan[];
  id: string;
  name: string;
  bank: string;
  brand: string;
  last4: string;
  color?: string | null;
  creditLimit: number | null;
  closingDay?: number | null;
  paymentDueDay?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  currency: string;
  currentCycle: CreditCardCycle;
  creditStatus: CreditCardStatus;
  nextPayment: CreditCardNextPayment | null;
  statementSummary: CreditCardStatementSummary;
  schedule: CreditCardSchedule;
  subscriptions: CreditCardSubscriptionsSummary;
  flags: CreditCardFlags;
  currencyMismatchCount: number;
};

export type CreditCardPortfolioCurrency = {
  currency: string;
  cardCount: number;
  totalCreditLimit: number;
  totalCurrentCycleSpend: number;
  totalAvailableCredit: number;
  totalOwedBalance: number;
  totalClosingBalance: number;
  totalPaid: number;
  totalStatementRemainder: number;
  totalDeferredInstallmentBalance: number;
  totalCurrentPaymentDue: number;
  earliestPaymentDueDate: string | null;
  totalPostCloseSpend: number;
  postCloseExpenseCount: number;
  totalProjectedNextCloseAmount: number;
  earliestProjectedNextCloseDate: string | null;
  totalProjectedDebt: number;
  totalNextClosePaymentEstimate: number;
  totalEstimatedRemainingAfterNextClose: number;
  utilizationPercent: number | null;
  monthlyRecurringSpend: number;
};

export type CreditCardPortfolio = {
  trackedCards: number;
  activeCards: number;
  cardsWithLimit: number;
  byCurrency: CreditCardPortfolioCurrency[];
  paymentDueSoonCount: number;
  highUtilizationCount: number;
  linkedSubscriptionsCount: number;
};

export type CreditCardOverviewResponse = {
  referenceDate: string;
  portfolio: CreditCardPortfolio;
  cards: CreditCardOverviewItem[];
};

export type DeleteCreditCardPermanentlyResponse = {
  id: string;
  deleted: true;
  unlinkedExpenses: number;
  unlinkedSubscriptions: number;
};

export type CardPaymentDate =
  | { kind: "statement" | "scheduled"; date: string }
  | { kind: "missing" };

export type CardPaymentAlert = {
  card: CreditCardOverviewItem;
  dueDate: string;
  amount: number;
  daysUntilDue: number;
};

/** A cutoff passed and the statement for it has not been uploaded yet (no amount is known). */
export type CutoffStatementAlert = {
  card: CreditCardOverviewItem;
  cutoffDate: string | null;
  daysSinceCutoff: number | null;
};
