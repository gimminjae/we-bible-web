"use client";

import { useCallback } from "react";
import { toast, type ToastOptions, type Id } from "react-toastify";

export function useToast() {
  const showToast = useCallback((message: string, options?: ToastOptions): Id => {
    return toast(message, options);
  }, []);

  const dismissToast = useCallback((toastId?: Id) => {
    toast.dismiss(toastId);
  }, []);

  return {
    showToast,
    dismissToast,
  };
}
