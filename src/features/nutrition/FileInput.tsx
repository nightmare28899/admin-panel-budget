"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";

/** File picker with translated copy; the native input's text follows the browser language. */
export function FileInput({
  id,
  name,
  accept,
  required,
}: {
  id: string;
  name: string;
  accept?: string;
  required?: boolean;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const clear = () => setFileName("");
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);

  return (
    <div className="flex w-full items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-3)]/60 px-3 py-2">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        {t("nutChooseOneFile")}
      </Button>
      <span className="min-w-0 truncate text-sm text-[var(--text-2)]">
        {fileName || t("noFileSelected")}
      </span>
    </div>
  );
}
