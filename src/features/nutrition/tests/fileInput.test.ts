import { describe, expect, it } from "vitest";
import { messages } from "@/i18n/messages";

describe("file input copy", () => {
  it("is translated instead of relying on the browser's native text", () => {
    expect(messages.es.nutChooseOneFile).toBe("Elegir archivo");
    expect(messages.en.nutChooseOneFile).toBe("Choose file");
    expect(messages.es.noFileSelected).toBe("Ningún archivo seleccionado");
  });
});
