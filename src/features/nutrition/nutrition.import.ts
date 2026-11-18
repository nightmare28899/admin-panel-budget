import { z } from "zod";
import { dietSchema } from "./nutrition.schemas";
import type { MessageKey } from "@/i18n/messages";
import type { Diet } from "./nutrition.types";

export const MAX_IMPORT_FILES = 3;
export const MAX_IMPORT_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_IMPORT_PDF_SIZE = 10 * 1024 * 1024;
/** Largest legitimate multipart body: three 5 MiB photos or one 10 MiB PDF. */
export const MAX_IMPORT_BODY_SIZE = MAX_IMPORT_IMAGE_SIZE * MAX_IMPORT_FILES + 65536;
/** The existing original-retention upload only takes jpg/png/pdf up to 5 MiB. */
export const MAX_RETAINED_ORIGINAL_SIZE = 5 * 1024 * 1024;

export type ImportFileInfo = { name: string; size: number };
export type ImportRejection = "empty" | "count" | "mixed" | "type" | "imageSize" | "pdfSize";

const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

/** Cheap client/proxy precheck; the backend re-validates magic bytes. */
export function classifyImportFiles(files: ImportFileInfo[]): ImportRejection | null {
  if (!files.length) return "empty";
  if (files.length > MAX_IMPORT_FILES) return "count";
  const pdfs = files.filter((file) => extensionOf(file.name) === "pdf").length;
  if (pdfs > 0 && files.length > 1) return "mixed";
  for (const file of files) {
    const extension = extensionOf(file.name);
    if (file.size <= 0 || (extension !== "pdf" && !IMAGE_EXTENSIONS.includes(extension)))
      return "type";
    if (extension === "pdf" ? file.size > MAX_IMPORT_PDF_SIZE : file.size > MAX_IMPORT_IMAGE_SIZE)
      return extension === "pdf" ? "pdfSize" : "imageSize";
  }
  return null;
}

/** Splits files into those the original-retention upload accepts and the rest. */
export function attachableOriginals<T extends ImportFileInfo>(files: T[]) {
  const attach: T[] = [];
  const skipped: T[] = [];
  for (const file of files) {
    const ok =
      ["jpg", "jpeg", "png", "pdf"].includes(extensionOf(file.name)) &&
      file.size > 0 &&
      file.size <= MAX_RETAINED_ORIGINAL_SIZE;
    (ok ? attach : skipped).push(file);
  }
  return { attach, skipped };
}

const importResponseSchema = z.object({
  draft: dietSchema,
  warnings: z.array(z.string()).default([]),
  unmapped: z.array(z.string()).default([]),
});
export type ImportResult = { draft: Diet; warnings: string[]; unmapped: string[] };

export function parseImportResponse(data: unknown): ImportResult | null {
  const parsed = importResponseSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Localization key for a failed import, by HTTP status of the proxy response. */
export function importErrorKey(status: number): MessageKey {
  switch (status) {
    case 400:
      return "nutImportErrorInvalid";
    case 401:
      return "nutImportErrorSession";
    case 413:
      return "nutImportErrorTooLarge";
    case 422:
      return "nutImportErrorUnreadable";
    case 429:
      return "nutImportErrorBusy";
    case 503:
      return "nutImportErrorUnavailable";
    default:
      return "nutImportErrorFailed";
  }
}

export const rejectionKey: Record<ImportRejection, MessageKey> = {
  empty: "nutImportErrorInvalid",
  count: "nutImportErrorInvalid",
  mixed: "nutImportErrorInvalid",
  type: "nutImportErrorInvalid",
  imageSize: "nutImportErrorTooLarge",
  pdfSize: "nutImportErrorTooLarge",
};
