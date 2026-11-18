import { describe, expect, it } from "vitest";
import { splitFormattedAmount } from "./auroraAmount";

describe("splitFormattedAmount", () => {
  it("splits a dot decimal", () => {
    expect(splitFormattedAmount("6,753.37")).toEqual({ whole: "6,753", decimals: ".37" });
  });
  it("splits a comma decimal", () => {
    expect(splitFormattedAmount("6.753,37")).toEqual({ whole: "6.753", decimals: ",37" });
  });
  it("keeps values without decimals whole", () => {
    expect(splitFormattedAmount("1,234")).toEqual({ whole: "1,234", decimals: "" });
    expect(splitFormattedAmount("—")).toEqual({ whole: "—", decimals: "" });
  });
  it("handles negatives and zero", () => {
    expect(splitFormattedAmount("-0.50")).toEqual({ whole: "-0", decimals: ".50" });
  });
});
