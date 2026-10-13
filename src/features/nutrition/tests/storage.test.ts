import { describe, expect, it } from "vitest";
import { MAX_ORIGINAL_SIZE, readOriginalForm, validateOriginal } from "../nutrition.storage";
const id = "12345678-1234-1234-1234-123456789abd";
const pdf = new TextEncoder().encode("%PDF-1.7\nSynthetic test only\n%%EOF");
describe("private originals", () => {
  it("bounds actual multipart bytes even when the declared length is false", async () => {
    const body = new FormData();
    body.set("file", new Blob([new Uint8Array(MAX_ORIGINAL_SIZE + 65537)]), "diet.pdf");
    const request = new Request("http://localhost/synthetic-only", {
      method: "POST",
      body,
      headers: { "content-length": "1" },
    });
    await expect(readOriginalForm(request)).rejects.toThrow(RangeError);
  });
  it("parses bounded multipart originals", async () => {
    const body = new FormData();
    body.set("dietId", id);
    body.set("file", new File([pdf], "diet.pdf"));
    const form = await readOriginalForm(
      new Request("http://localhost/synthetic-only", {
        method: "POST",
        body,
      }),
    );
    expect(form.get("dietId")).toBe(id);
    expect((form.get("file") as File).size).toBe(pdf.length);
  });
  it("accepts PDF content and matching extension, not client MIME", () =>
    expect(validateOriginal({ name: "diet.pdf", bytes: pdf })).toBe("application/pdf"));
  it("rejects mismatched extensions and invalid signatures", () => {
    expect(() => validateOriginal({ name: "diet.jpg", bytes: pdf })).toThrow();
    expect(() =>
      validateOriginal({ name: "diet.pdf", bytes: new TextEncoder().encode("not a pdf") }),
    ).toThrow();
  });
  it("validates JPEG boundaries", () => {
    const bytes = new Uint8Array([255, 216, 255, 224, 0, 0, 0, 0, 0, 0, 255, 217]);
    expect(validateOriginal({ name: "diet.JPG", bytes })).toBe("image/jpeg");
    bytes[11] = 0;
    expect(() => validateOriginal({ name: "diet.jpg", bytes })).toThrow();
  });
  it("validates PNG signature, IHDR and IEND boundaries", () => {
    const bytes = new Uint8Array(45);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    bytes.set(new TextEncoder().encode("IHDR"), 12);
    bytes.set(new TextEncoder().encode("IEND"), 37);
    expect(validateOriginal({ name: "diet.png", bytes })).toBe("image/png");
  });
  it("rejects empty and oversized files", () => {
    expect(() => validateOriginal({ name: "diet.pdf", bytes: new Uint8Array() })).toThrow();
    expect(() =>
      validateOriginal({ name: "diet.pdf", bytes: new Uint8Array(MAX_ORIGINAL_SIZE + 1) }),
    ).toThrow();
  });
});
