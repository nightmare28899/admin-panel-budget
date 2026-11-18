import { describe, expect, it } from "vitest";
import { averagePerDay, daysElapsedInMonth } from "./expenseMetrics";

describe("daysElapsedInMonth", () => {
  it("counts the current day", () => {
    expect(daysElapsedInMonth(new Date(2026, 10, 18))).toBe(18);
  });
  it("is 1 on the first day", () => {
    expect(daysElapsedInMonth(new Date(2026, 0, 1))).toBe(1);
  });
});

describe("averagePerDay", () => {
  it("divides the total by the elapsed days", () => {
    expect(averagePerDay(180, 18)).toBe(10);
  });
  it("guards against zero or invalid days", () => {
    expect(averagePerDay(50, 0)).toBe(0);
    expect(averagePerDay(Number.NaN, 5)).toBe(0);
  });
});
