"use client";

import { useAppStore } from "@/store/app-store";

import { usePersistedDomainLoad } from "@/hooks/use-persisted-domain-load";

const PRAYERS_SLICES = ["prayers"] as const;

export function usePrayers() {
  const { isLoading, error } = usePersistedDomainLoad([...PRAYERS_SLICES]);
  const prayers = useAppStore((state) => state.prayers);
  const addPrayer = useAppStore((state) => state.addPrayer);
  const updatePrayer = useAppStore((state) => state.updatePrayer);
  const deletePrayer = useAppStore((state) => state.deletePrayer);
  const addPrayerContent = useAppStore((state) => state.addPrayerContent);
  const updatePrayerContent = useAppStore((state) => state.updatePrayerContent);
  const deletePrayerContent = useAppStore((state) => state.deletePrayerContent);

  return {
    prayers,
    addPrayer,
    updatePrayer,
    deletePrayer,
    addPrayerContent,
    updatePrayerContent,
    deletePrayerContent,
    isLoading,
    error,
  };
}
