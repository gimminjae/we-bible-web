"use client";

import { useToastStore } from "@/store/toast-store";

export function useToast() {
  const showToast = useToastStore((state) => state.showToast);
  return { showToast };
}
