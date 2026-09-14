import { useCallback, useState, type RefObject } from "react";
import { createStatementImportAction } from "@/lib/userActions";
import { useSessionRedirect } from "./useSessionRedirect";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";

const MAX_STATEMENT_FILE_SIZE = 10 * 1024 * 1024;

function validateStatementFile(file: File, invalidType: string, tooLarge: string): string | undefined {
  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  if (file.type !== "application/pdf" && !hasPdfExtension) {
    return invalidType;
  }
  if (file.size > MAX_STATEMENT_FILE_SIZE) {
    return tooLarge;
  }
  return undefined;
}

export function useStatementUpload({
  fileInputRef,
  selectedCardId,
  onUploaded,
  setError,
  setNotice,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  selectedCardId: string | undefined;
  onUploaded: () => void | Promise<void>;
  setError: (message?: string) => void;
  setNotice: (message?: string) => void;
}) {
  const { t } = useLocale();
  const redirectIfExpired = useSessionRedirect();
  const [file, setFile] = useState<File>();
  const [uploading, setUploading] = useState(false);

  const selectFile = useCallback(
    (nextFile?: File) => {
      setNotice(undefined);
      setError(undefined);
      if (!nextFile) {
        setFile(undefined);
        return;
      }

      const validationError = validateStatementFile(nextFile, t("choosePdf"), t("pdfTooLarge"));
      if (validationError) {
        setFile(undefined);
        setError(validationError);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFile(nextFile);
    },
    [fileInputRef, setError, setNotice, t],
  );

  const upload = useCallback(async () => {
    if (!file) {
      setError(t("choosePdfBeforeUpload"));
      return;
    }
    if (!selectedCardId) {
      setError(t("cardRequiredBeforeUpload"));
      return;
    }

    setUploading(true);
    setError(undefined);
    setNotice(undefined);
    const result = await createStatementImportAction(file, selectedCardId);
    setUploading(false);

    if (redirectIfExpired(result.sessionExpired)) return;
    if (result.error || !result.data) {
      setError(frontendError(result.error, t, "statementUploadFailed"));
      return;
    }

    const imported = result.data;
    const processingError =
      imported.status === "FAILED"
        ? imported.failureMessage || imported.failureCode
          ? t("pdfStoredProcessingFailedDetail", { detail: imported.failureMessage || imported.failureCode || "" })
          : t("pdfStoredProcessingFailed")
        : undefined;

    if (!processingError && imported.duplicate) {
      setNotice(t("duplicatePdf"));
    } else if (imported.status === "NEEDS_REVIEW") {
      setNotice(t("statementReady"));
    } else if (!processingError) {
      setNotice(t("statementUploaded"));
    }

    setFile(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await onUploaded();
    if (processingError) setError(processingError);
  }, [file, fileInputRef, selectedCardId, onUploaded, redirectIfExpired, setError, setNotice, t]);

  return { file, uploading, selectFile, upload };
}
