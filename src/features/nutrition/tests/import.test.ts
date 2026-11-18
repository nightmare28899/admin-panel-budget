import { describe, expect, it } from "vitest";
import {
  attachableOriginals,
  classifyImportFiles,
  importErrorKey,
  parseImportResponse,
} from "../nutrition.import";

const MiB = 1024 * 1024;
const f = (name: string, size = 1000) => ({ name, size });
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const draft = () => ({
  id: uuid(1),
  title: "Plan",
  startDate: "2026-10-06",
  endDate: null,
  status: "draft",
  active: false,
  meals: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"].map((type, i) => ({
    id: uuid(10 + i),
    type,
    options:
      i === 0
        ? [
            {
              id: uuid(20),
              title: "Opción 1",
              notes: "",
              recipeId: null,
              portions: [
                {
                  id: uuid(30),
                  foodId: "huevo",
                  foodName: "Huevo",
                  quantity: "2",
                  unit: "piezas",
                  preparation: "",
                  free: false,
                },
              ],
            },
          ]
        : [],
  })),
});

describe("classifyImportFiles", () => {
  it("accepts 1-3 images or a single pdf", () => {
    expect(classifyImportFiles([f("a.jpg")])).toBeNull();
    expect(classifyImportFiles([f("a.PNG"), f("b.webp"), f("c.jpeg")])).toBeNull();
    expect(classifyImportFiles([f("a.pdf", 9 * MiB)])).toBeNull();
  });
  it("rejects empty, too many, mixed, multiple pdfs and unknown types", () => {
    expect(classifyImportFiles([])).toBe("empty");
    expect(classifyImportFiles([f("1.jpg"), f("2.jpg"), f("3.jpg"), f("4.jpg")])).toBe("count");
    expect(classifyImportFiles([f("a.jpg"), f("b.pdf")])).toBe("mixed");
    expect(classifyImportFiles([f("a.pdf"), f("b.pdf")])).toBe("mixed");
    expect(classifyImportFiles([f("a.gif")])).toBe("type");
  });
  it("enforces 5 MiB per image and 10 MiB per pdf", () => {
    expect(classifyImportFiles([f("a.jpg", 5 * MiB + 1)])).toBe("imageSize");
    expect(classifyImportFiles([f("a.pdf", 10 * MiB + 1)])).toBe("pdfSize");
    expect(classifyImportFiles([f("a.jpg", 0)])).toBe("type");
  });
});

describe("attachableOriginals", () => {
  it("keeps jpg/png/pdf up to 5 MiB and skips webp and oversized files", () => {
    const files = [f("a.jpg"), f("b.webp"), f("c.pdf", 6 * MiB), f("d.png", 5 * MiB)];
    const { attach, skipped } = attachableOriginals(files);
    expect(attach.map((file) => file.name)).toEqual(["a.jpg", "d.png"]);
    expect(skipped.map((file) => file.name)).toEqual(["b.webp", "c.pdf"]);
  });
});

describe("parseImportResponse", () => {
  it("parses a valid draft with warnings and unmapped", () => {
    const result = parseImportResponse({ draft: draft(), warnings: ["w"], unmapped: ["u"] });
    expect(result?.draft.title).toBe("Plan");
    expect(result?.warnings).toEqual(["w"]);
    expect(result?.unmapped).toEqual(["u"]);
  });
  it("defaults missing warnings/unmapped to empty lists", () => {
    expect(parseImportResponse({ draft: draft() })?.warnings).toEqual([]);
  });
  it("returns null for malformed payloads", () => {
    expect(parseImportResponse(null)).toBeNull();
    expect(parseImportResponse({ draft: { ...draft(), meals: [] } })).toBeNull();
    expect(parseImportResponse({ warnings: [] })).toBeNull();
  });
});

describe("importErrorKey", () => {
  it.each([
    [400, "nutImportErrorInvalid"],
    [401, "nutImportErrorSession"],
    [413, "nutImportErrorTooLarge"],
    [422, "nutImportErrorUnreadable"],
    [429, "nutImportErrorBusy"],
    [503, "nutImportErrorUnavailable"],
    [502, "nutImportErrorFailed"],
    [500, "nutImportErrorFailed"],
  ])("maps %s to %s", (status, key) => expect(importErrorKey(status)).toBe(key));
});
