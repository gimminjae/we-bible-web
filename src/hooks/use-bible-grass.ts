"use client";

import { useAppStore } from "@/store/app-store";

import { usePersistedDomainLoad } from "@/hooks/use-persisted-domain-load";

const GRASS_SLICES = ["grassData"] as const;

export function useBibleGrass() {
  const { isLoading, error } = usePersistedDomainLoad([...GRASS_SLICES]);
  const grassData = useAppStore((state) => state.grassData);
  const grassTheme = useAppStore((state) => state.grassTheme);
  const setGrassTheme = useAppStore((state) => state.setGrassTheme);
  const fillPastGrass = useAppStore((state) => state.fillPastGrass);
  const stepRewardUsedDate = useAppStore((state) => state.stepRewardUsedDate);
  const markStepRewardUsed = useAppStore((state) => state.markStepRewardUsed);

  return {
    grassData,
    grassTheme,
    setGrassTheme,
    fillPastGrass,
    stepRewardUsedDate,
    markStepRewardUsed,
    isLoading,
    error,
  };
}
