import { describe, expect, it } from "vitest";
import { selectValue } from "../domain/select";
import { messages } from "@/i18n/messages";

describe("selectValue", () => {
  it("maps empty values to undefined so the placeholder is shown", () => {
    expect(selectValue("")).toBeUndefined();
    expect(selectValue(null)).toBeUndefined();
    expect(selectValue(undefined)).toBeUndefined();
  });

  it("keeps real values untouched", () => {
    expect(selectValue("lunch")).toBe("lunch");
  });
});

describe("select placeholder copy", () => {
  it("exists in both locales", () => {
    expect(messages.es.nutSelectPlaceholder).toBe("Selecciona un elemento");
    expect(messages.en.nutSelectPlaceholder).toBe("Select an item");
  });
});
