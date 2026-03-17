"use client";

import { useAppStore } from "@/store/app-store";

export function useHydrated(): boolean {
  return useAppStore((state) => state.hasHydrated);
}
