import { useCallback, useState, type RefObject } from "react";
import { createStatementImportAction } from "@/lib/userActions";
import { useSessionRedirect } from "./useSessionRedirect";

const MAX_STATEMENT_FILE_SIZE = 10 * 1024 * 1024;

function validateStatementFile(file: File): string | undefined {
  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  if (file.type !== "application/pdf" && !hasPdfExtension) {
    return "Choose a PDF statement.";
  }
  if (file.size > MAX_STATEMENT_FILE_SIZE) {
    return "The PDF must be 10 MB or smaller.";
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

      const validationError = validateStatementFile(nextFile);
      if (validationError) {
        setFile(undefined);
        setError(validationError);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFile(nextFile);
    },
    [fileInputRef, setError, setNotice],
  );

  const upload = useCallback(async () => {
    if (!file) {
      setError("Choose a PDF statement before uploading.");
      return;
    }

    setUploading(true);
    setError(undefined);
    setNotice(undefined);
    const result = await createStatementImportAction(file, selectedCardId);
    setUploading(false);

    if (redirectIfExpired(result.sessionExpired)) return;
    if (result.error || !result.data) {
      setError(result.error ?? "The statement could not be uploaded.");
      return;
    }

    const imported = result.data;
    const processingError =
      imported.status === "FAILED"
        ? imported.failureMessage || imported.failureCode
          ? `The PDF was stored, but processing failed: ${imported.failureMessage || imported.failureCode}`
          : "The PDF was stored, but processing failed."
        : undefined;

    if (!processingError && imported.duplicate) {
      setNotice("This PDF was already uploaded. Its existing import is shown below.");
    } else if (imported.status === "NEEDS_REVIEW") {
      setNotice("Statement processed successfully and is ready for review.");
    } else if (!processingError) {
      setNotice("Statement uploaded successfully.");
    }

    setFile(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await onUploaded();
    if (processingError) setError(processingError);
  }, [file, fileInputRef, selectedCardId, onUploaded, redirectIfExpired, setError, setNotice]);

  return { file, uploading, selectFile, upload };
}
