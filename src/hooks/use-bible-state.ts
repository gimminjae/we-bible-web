"use client";

import { useAppStore } from "@/store/app-store";

import { usePersistedDomainLoad } from "@/hooks/use-persisted-domain-load";

const APP_STATE_SLICES = ["appState"] as const;

export function useBibleState() {
  const { isLoading, error } = usePersistedDomainLoad([...APP_STATE_SLICES]);
  const bible = useAppStore((state) => state.bible);
  const setBibleState = useAppStore((state) => state.setBibleState);
  const goToBookChapter = useAppStore((state) => state.goToBookChapter);

  return {
    bible,
    setBibleState,
    goToBookChapter,
    isLoading,
    error,
  };
}
