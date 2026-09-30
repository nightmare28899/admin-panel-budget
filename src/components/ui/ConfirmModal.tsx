"use client";

import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "./Button";
import { Modal } from "./Modal";
import { useLocale } from "@/i18n/LocaleProvider";

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmingLabel,
  cancelLabel,
  confirmVariant = "danger",
  loading = false,
  confirmDisabled = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  confirmingLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  loading?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
}) {
  const { t } = useLocale();
  const closeIfIdle = () => {
    if (!loading) onClose();
  };

  return (
    <Modal open={open} onClose={closeIfIdle} title={title}>
      <p className="text-sm leading-6 text-[var(--text-2)]">{description}</p>
      {children}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={closeIfIdle} disabled={loading}>
          {cancelLabel ?? t("cancel")}
        </Button>
        <Button
          type="button"
          variant={confirmVariant}
          onClick={() => void onConfirm()}
          disabled={loading || confirmDisabled}
          aria-busy={loading}
        >
          {loading ? (confirmingLabel ?? t("working")) : (confirmLabel ?? t("confirm"))}
        </Button>
      </div>
    </Modal>
  );
}
