export type CreditCardWritePayload = {
  name: string;
  bank: string;
  brand: string;
  last4: string;
  color?: string;
  creditLimit?: number;
  closingDay?: number;
  paymentDueDay?: number;
};

export type CreditCardCycle = {
  start: string;
  end: string;
  spend: number;
  expenseCount: number;
};

export type CreditCardStatus = {
  limit: number | null;
  availableCredit: number | null;
  utilizationPercent: number | null;
};

export type CreditCardSchedule = {
  nextClosingDate: string | null;
  daysUntilClosing: number | null;
  nextPaymentDueDate: string | null;
  daysUntilPaymentDue: number | null;
};

export type CreditCardSubscriptionsSummary = {
  activeCount: number;
  monthlyRecurringSpend: number;
  nextChargeDate: string | null;
};

export type CreditCardFlags = {
  missingLimit: boolean;
  highUtilization: boolean;
  overLimit: boolean;
  paymentDueSoon: boolean;
  closingSoon: boolean;
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
  currentCycle: CreditCardCycle;
  creditStatus: CreditCardStatus;
  schedule: CreditCardSchedule;
  subscriptions: CreditCardSubscriptionsSummary;
  flags: CreditCardFlags;
};

export type CreditCardPortfolio = {
  trackedCards: number;
  activeCards: number;
  cardsWithLimit: number;
  totalCreditLimit: number;
  totalCurrentCycleSpend: number;
  totalAvailableCredit: number;
  utilizationPercent: number | null;
  paymentDueSoonCount: number;
  highUtilizationCount: number;
  linkedSubscriptionsCount: number;
  monthlyRecurringSpend: number;
};

export type CreditCardOverviewResponse = {
  referenceDate: string;
  portfolio: CreditCardPortfolio;
  cards: CreditCardOverviewItem[];
};
