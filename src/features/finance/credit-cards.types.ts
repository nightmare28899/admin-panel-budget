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
  dueDate: string | null;
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

export type CreditCardOverviewItem = {
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
