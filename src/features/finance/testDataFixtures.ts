import type { CreditCardWritePayload } from "./credit-cards.types";
import type {
  CategoryWritePayload,
  ExpenseWritePayload,
} from "./finance.types";

export const TEST_DATA_MARKER = "[Budget test data v1]";

export type TestDataCategoryFixture = {
  key: string;
  payload: CategoryWritePayload;
};

export type TestDataCardFixture = {
  payload: CreditCardWritePayload;
};

export type TestDataExpenseFixture = {
  marker: string;
  categoryKey: string;
  payload: Omit<ExpenseWritePayload, "categoryId">;
};

function calendarDateDaysAgo(referenceDate: Date, daysAgo: number) {
  const date = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate() - daysAgo,
    ),
  );
  return date.toISOString().slice(0, 10);
}

function calendarDateInMonth(
  referenceDate: Date,
  monthsAgo: number,
  preferredDay: number,
) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth() - monthsAgo;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const latestAllowedDay =
    monthsAgo === 0
      ? Math.min(lastDay, referenceDate.getUTCDate())
      : lastDay;
  return new Date(
    Date.UTC(year, month, Math.min(preferredDay, latestAllowedDay)),
  )
    .toISOString()
    .slice(0, 10);
}

export function buildTestDataFixtures(referenceDate = new Date()) {
  const categories: TestDataCategoryFixture[] = [
    {
      key: "groceries",
      payload: {
        name: `${TEST_DATA_MARKER} Groceries`,
        icon: "🛒",
        color: "#10B981",
        budgetAmount: 6500,
      },
    },
    {
      key: "dining",
      payload: {
        name: `${TEST_DATA_MARKER} Dining`,
        icon: "🍽️",
        color: "#F59E0B",
        budgetAmount: 3200,
      },
    },
    {
      key: "transport",
      payload: {
        name: `${TEST_DATA_MARKER} Transport`,
        icon: "🚇",
        color: "#3B82F6",
        budgetAmount: 2400,
      },
    },
    {
      key: "utilities",
      payload: {
        name: `${TEST_DATA_MARKER} Utilities`,
        icon: "💡",
        color: "#8B5CF6",
        budgetAmount: 2800,
      },
    },
    {
      key: "subscription",
      payload: {
        name: "Suscripción",
        icon: "🔁",
        color: "#EC4899",
        budgetAmount: 1800,
      },
    },
  ];

  const cards: TestDataCardFixture[] = [
    {
      payload: {
        name: `${TEST_DATA_MARKER} Rewards`,
        bank: "Budget Demo Bank",
        brand: "Visa",
        last4: "4242",
        color: "#0F766E",
        creditLimit: 45000,
        closingDay: 18,
        paymentDueDay: 8,
      },
    },
    {
      payload: {
        name: `${TEST_DATA_MARKER} Travel`,
        bank: "Budget Demo Bank",
        brand: "Mastercard",
        last4: "5454",
        color: "#4338CA",
        creditLimit: 70000,
        closingDay: 25,
        paymentDueDay: 15,
      },
    },
  ];

  const ordinaryExpenses = [
    ["groceries-01", "Weekly groceries", "groceries", "1280.40", "MXN", 2, "Fresh Market"],
    ["transport-01", "Metro and rides", "transport", "325.00", "MXN", 5, "City Transit"],
    ["dining-01", "Dinner with friends", "dining", "860.00", "MXN", 9, "Central Kitchen"],
    ["groceries-02", "Pantry restock", "groceries", "1745.25", "MXN", 15, "Fresh Market"],
    ["utilities-01", "Electric service", "utilities", "1189.60", "MXN", 22, "Electric Utility"],
    ["dining-02", "Coffee and lunch", "dining", "412.50", "MXN", 29, "Corner Cafe"],
    ["transport-02", "Fuel refill", "transport", "950.00", "MXN", 37, "Fuel Station"],
    ["groceries-03", "Monthly groceries", "groceries", "2310.80", "MXN", 46, "Neighborhood Market"],
    ["utilities-02", "Home internet", "utilities", "749.00", "MXN", 58, "Internet Provider"],
    ["dining-03", "Weekend brunch", "dining", "695.00", "MXN", 70, "Garden Cafe"],
    ["transport-03", "Airport transfer", "transport", "42.50", "USD", 82, "Airport Shuttle"],
    ["groceries-04", "Household supplies", "groceries", "1568.90", "MXN", 94, "Fresh Market"],
  ] as const;

  const expenses: TestDataExpenseFixture[] = ordinaryExpenses.map(
    ([id, title, categoryKey, cost, currency, daysAgo, merchantName]) => ({
      marker: `${TEST_DATA_MARKER}:${id}`,
      categoryKey,
      payload: {
        title: `${TEST_DATA_MARKER} ${title}`,
        cost,
        currency,
        date: calendarDateDaysAgo(referenceDate, daysAgo),
        note: `${TEST_DATA_MARKER}:${id}`,
        merchantName,
        locationLabel: "Test fixture",
      },
    }),
  );

  for (const [id, title, cost, preferredDay] of [
    ["streaming", "Stream Plus", "249.00", 8],
    ["cloud", "Cloud Storage", "129.00", 17],
  ] as const) {
    for (let monthsAgo = 0; monthsAgo < 4; monthsAgo += 1) {
      const date = calendarDateInMonth(referenceDate, monthsAgo, preferredDay);
      const marker = `${TEST_DATA_MARKER}:${id}-${date.slice(0, 7)}`;
      expenses.push({
        marker,
        categoryKey: "subscription",
        payload: {
          title: `${TEST_DATA_MARKER} ${title}`,
          cost,
          currency: "MXN",
          date,
          note: marker,
          merchantName: title,
          locationLabel: "Recurring test fixture",
        },
      });
    }
  }

  const additionalSubscriptions = [
    ["cinema-stream", "Cinema Stream", "179.00", 3],
    ["series-hub", "Series Hub", "219.00", 5],
    ["music-wave", "Music Wave", "115.00", 7],
    ["podcast-plus", "Podcast Plus", "89.00", 9],
    ["office-suite", "Office Suite", "159.00", 11],
    ["design-studio", "Design Studio", "349.00", 13],
    ["task-planner", "Task Planner", "95.00", 15],
    ["team-chat", "Team Chat", "135.00", 17],
    ["cloud-vault", "Cloud Vault", "149.00", 19],
    ["secure-vpn", "Secure VPN", "129.00", 21],
    ["password-safe", "Password Safe", "79.00", 23],
    ["fitness-club", "Fitness Club", "499.00", 25],
    ["meditation-room", "Meditation Room", "139.00", 27],
    ["language-lab", "Language Lab", "289.00", 4],
    ["learning-library", "Learning Library", "319.00", 6],
    ["daily-journal", "Daily Journal", "169.00", 10],
    ["audio-books", "Audio Books", "199.00", 12],
    ["game-pass", "Game Pass", "279.00", 16],
    ["delivery-club", "Delivery Club", "99.00", 20],
    ["meal-planner", "Meal Planner", "189.00", 24],
  ] as const;

  for (const [id, title, cost, preferredDay] of additionalSubscriptions) {
    for (let monthsAgo = 0; monthsAgo < 3; monthsAgo += 1) {
      const date = calendarDateInMonth(referenceDate, monthsAgo, preferredDay);
      const marker = `${TEST_DATA_MARKER}:${id}-${date.slice(0, 7)}`;
      expenses.push({
        marker,
        categoryKey: "subscription",
        payload: {
          title: `${TEST_DATA_MARKER} ${title}`,
          cost,
          currency: "MXN",
          date,
          note: marker,
          merchantName: title,
          locationLabel: "Recurring test fixture",
        },
      });
    }
  }

  return { categories, cards, expenses };
}
