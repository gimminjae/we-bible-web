"use client";

import { useCallback } from "react";

import { openConfirmDialog, type ConfirmDialogOptions } from "@/components/ui/confirm-dialog";

type ConfirmOptions = ConfirmDialogOptions;

export function useConfirm() {
  const confirm = useCallback((options: ConfirmOptions) => {
    return openConfirmDialog(options);
  }, []);

  const confirmDestructive = useCallback((options: Omit<ConfirmOptions, "tone">) => {
    return openConfirmDialog({
      ...options,
      tone: "danger",
    });
  }, []);

  return {
    confirm,
    confirmDestructive,
  };
}

export type { ConfirmOptions };
