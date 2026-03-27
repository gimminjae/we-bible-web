"use client";

import { useAppStore } from "@/store/app-store";

import { usePersistedDomainLoad } from "@/hooks/use-persisted-domain-load";

const FAVORITES_SLICES = ["favorites"] as const;

export function useFavorites() {
  const { isLoading, error } = usePersistedDomainLoad([...FAVORITES_SLICES]);
  const favorites = useAppStore((state) => state.favorites);
  const addFavorites = useAppStore((state) => state.addFavorites);
  const removeFavorites = useAppStore((state) => state.removeFavorites);

  return {
    favorites,
    addFavorites,
    removeFavorites,
    isLoading,
    error,
  };
}
