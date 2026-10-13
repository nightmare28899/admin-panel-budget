"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";
import { Banner, Icon, InsetPanel, icons } from "./NutritionUi";
import {
  classifyImportFiles,
  importErrorKey,
  parseImportResponse,
  rejectionKey,
  type ImportResult,
} from "./nutrition.import";

/** Drop zone + file list that turns diet photos/PDF into an editable draft. */
export function DietImportCard({
  disabled,
  onImported,
}: {
  disabled?: boolean;
  onImported: (result: ImportResult, files: File[]) => void;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    [files],
  );
  useEffect(
    () => () => previews.forEach((preview) => preview.url && URL.revokeObjectURL(preview.url)),
    [previews],
  );

  const addFiles = (incoming: FileList | File[]) => {
    const added = Array.from(incoming);
    const isPdf = (file: File) => file.name.toLowerCase().endsWith(".pdf");
    // A PDF stands alone: choosing one replaces the selection, and choosing
    // photos while a PDF is selected replaces the PDF.
    const pdf = added.filter(isPdf).at(-1);
    const merged = pdf ? [pdf] : files.some(isPdf) ? added : [...files, ...added];
    setFiles(merged);
    const rejection = classifyImportFiles(merged);
    setError(rejection && rejection !== "empty" ? t(rejectionKey[rejection]) : null);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled && !loading) addFiles(event.dataTransfer.files);
  };

  const submit = async () => {
    const rejection = classifyImportFiles(files);
    if (rejection) {
      setError(t(rejectionKey[rejection]));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      for (const file of files) body.append("files", file, file.name);
      const response = await fetch("/api/nutrition/diet-imports", { method: "POST", body });
      if (!response.ok) {
        setError(t(importErrorKey(response.status)));
        return;
      }
      const result = parseImportResponse(await response.json());
      if (!result) {
        setError(t("nutImportErrorFailed"));
        return;
      }
      onImported(result, files);
      setFiles([]);
    } catch {
      setError(t("nutImportErrorFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-label={t("nutImporterTitle")}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`mb-4 rounded-2xl border bg-gradient-to-br from-[var(--accent-dim)] to-transparent p-5 print:hidden ${
        dragging ? "border-[var(--accent)]" : "border-[var(--accent)]/30"
      }`}
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-dim)] text-[var(--accent-text)]">
          <Icon size={22}>{icons.sparkle}</Icon>
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-[15px] font-semibold text-[var(--text-1)]">{t("nutImporterTitle")}</h2>
            <span className="rounded-md border border-[var(--border-soft)] bg-[var(--bg-3)] px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-[var(--accent-text)]">
              {t("nutOcrTag")}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-3)]">{t("nutUploadNotice")}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept="image/*,application/pdf"
          aria-label={t("nutImportChoose")}
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="tinted"
            disabled={disabled || loading}
            onClick={() => inputRef.current?.click()}
            className="!rounded-xl"
          >
            <Icon size={16}>{icons.upload}</Icon>
            {t("nutUploadPdfOrPhoto")}
          </Button>
          <button
            type="button"
            aria-label={t("nutImportInfo")}
            title={t("nutImportInfo")}
            aria-expanded={showHint}
            aria-controls="diet-import-hint"
            onClick={() => setShowHint(!showHint)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--border-soft)] text-[var(--text-3)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
          >
            <Icon size={18}>{icons.info}</Icon>
          </button>
        </div>
      </div>

      {showHint && (
        <p id="diet-import-hint" className="mt-3 text-xs text-[var(--text-3)]">
          {t("nutImportDescription")} {t("nutImportHint")}
        </p>
      )}

      {previews.length > 0 && (
        <ul className="m-0 mt-4 flex list-none flex-wrap gap-3 p-0">
          {previews.map(({ file, url }, index) => (
            <li key={`${file.name}-${index}`}>
              <InsetPanel className="flex w-36 flex-col gap-2">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={file.name} className="h-24 w-full rounded object-cover" />
                ) : (
                  <div className="flex h-24 items-center justify-center text-[var(--text-3)]">
                    <Icon size={32}>{icons.file}</Icon>
                  </div>
                )}
                <span className="truncate text-xs text-[var(--text-2)]" title={file.name}>
                  {file.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  aria-label={t("nutImportRemoveFile", { name: file.name })}
                  onClick={() => setFiles(files.filter((_, i) => i !== index))}
                >
                  {t("nutImportRemove")}
                </Button>
              </InsetPanel>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <Banner tone="error" className="mt-4" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}
      {loading && (
        <Banner tone="info" className="mt-4">
          <strong>{t("nutImportReading")}</strong> {t("nutImportReadingHint")}
        </Banner>
      )}

      {files.length > 0 && (
        <div className="mt-4">
          <Button
            type="button"
            loading={loading}
            disabled={disabled || !files.length}
            onClick={() => void submit()}
          >
            {t("nutImportRead")}
          </Button>
        </div>
      )}
    </section>
  );
}
