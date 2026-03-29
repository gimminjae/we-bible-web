"use client";

import { useCallback, useEffect } from "react";
import { ContextAwareConfirmation, confirmable, type ConfirmDialogProps } from "react-confirm";

import { CircleHelp, Trash2 } from "@/components/icons";
import { cn } from "@/utils/cn";
import { useI18n } from "@/utils/i18n";

const CONFIRM_DIALOG_TRANSITION_MS = 220;

export type ConfirmDialogOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
};

function AppConfirmDialog({
  show,
  proceed,
  title,
  message,
  confirmText,
  cancelText,
  tone = "default",
}: ConfirmDialogProps<ConfirmDialogOptions, boolean>) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("common.confirm");
  const resolvedConfirmText = confirmText ?? t("common.confirm");
  const resolvedCancelText = cancelText ?? t("common.cancel");

  const closeDialog = useCallback(() => {
    proceed(false);
  }, [proceed]);

  useEffect(() => {
    if (!show) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeDialog, show]);

  useEffect(() => {
    if (!show) return undefined;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [show]);

  return (
    <div className={cn("fixed inset-0 z-[120] p-4 transition-opacity duration-200", show ? "opacity-100" : "pointer-events-none opacity-0")}>
      <button
        type="button"
        aria-label={resolvedCancelText}
        className="absolute inset-0 bg-black/45"
        onClick={closeDialog}
      />

      <div className="relative flex min-h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-confirm-dialog-title"
          aria-describedby="app-confirm-dialog-message"
          className={cn(
            "relative w-full max-w-sm rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-2xl transition-all duration-[220ms]",
            show ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.98] opacity-0",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className={cn(
              "mx-auto flex size-14 items-center justify-center rounded-[1.25rem]",
              tone === "danger" ? "bg-error/12 text-error" : "bg-primary/12 text-primary",
            )}
          >
            {tone === "danger" ? <Trash2 className="size-6" /> : <CircleHelp className="size-6" />}
          </div>

          <div className="mt-4 text-center">
            <h2 id="app-confirm-dialog-title" className="text-lg font-semibold tracking-[-0.01em] text-base-content">
              {resolvedTitle}
            </h2>
            <p id="app-confirm-dialog-message" className="mt-2 whitespace-pre-line text-sm leading-6 text-base-content/70">
              {message}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" className="btn btn-outline" onClick={() => proceed(false)}>
              {resolvedCancelText}
            </button>
            <button type="button" className={cn("btn", tone === "danger" ? "btn-error" : "btn-primary")} onClick={() => proceed(true)}>
              {resolvedConfirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const openConfirmDialog = ContextAwareConfirmation.createConfirmation(
  confirmable(AppConfirmDialog),
  CONFIRM_DIALOG_TRANSITION_MS,
);

export function ConfirmDialogRoot() {
  return <ContextAwareConfirmation.ConfirmationRoot />;
}
