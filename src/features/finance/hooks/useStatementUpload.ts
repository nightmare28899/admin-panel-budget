import { useCallback, useState, type RefObject } from "react";
import { createStatementImportAction } from "@/lib/userActions";
import { useSessionRedirect } from "./useSessionRedirect";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";
import { useToast } from "@/components/ui/ToastProvider";

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
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  selectedCardId: string | undefined;
  onUploaded: () => void | Promise<void>;
  setError: (message?: string) => void;
}) {
  const { t } = useLocale();
  const toast = useToast();
  const redirectIfExpired = useSessionRedirect();
  const [file, setFile] = useState<File>();
  const [uploading, setUploading] = useState(false);

  const selectFile = useCallback(
    (nextFile?: File) => {
      setError(undefined);
      if (!nextFile) {
        setFile(undefined);
        return;
      }

      const validationError = validateStatementFile(nextFile, t("choosePdf"), t("pdfTooLarge"));
      if (validationError) {
        setFile(undefined);
        setError(validationError);
        toast.error(validationError);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFile(nextFile);
    },
    [fileInputRef, setError, toast, t],
  );

  const upload = useCallback(async () => {
    if (!file) {
      const message = t("choosePdfBeforeUpload");
      setError(message);
      toast.error(message);
      return;
    }
    if (!selectedCardId) {
      const message = t("cardRequiredBeforeUpload");
      setError(message);
      toast.error(message);
      return;
    }

    setUploading(true);
    setError(undefined);
    try {
      const result = await createStatementImportAction(file, selectedCardId);

      if (redirectIfExpired(result.sessionExpired)) return;
      if (result.error || !result.data) {
        const message = frontendError(result.error, t, "statementUploadFailed");
        setError(message);
        toast.error(message);
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
        toast.success(t("duplicatePdf"));
      } else if (imported.status === "NEEDS_REVIEW") {
        toast.success(t("statementReady"));
      } else if (!processingError) {
        toast.success(t("statementUploaded"));
      }

      setFile(undefined);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await onUploaded();
      if (processingError) {
        setError(processingError);
        toast.error(processingError);
      }
    } catch (err) {
      const message = frontendError(err instanceof Error ? err.message : undefined, t, "statementUploadFailed");
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }, [file, fileInputRef, selectedCardId, onUploaded, redirectIfExpired, setError, toast, t]);

  return { file, uploading, selectFile, upload };
}
