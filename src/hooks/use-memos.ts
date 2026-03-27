"use client";

import { useAppStore } from "@/store/app-store";

import { usePersistedDomainLoad } from "@/hooks/use-persisted-domain-load";

const MEMOS_SLICES = ["memos"] as const;

export function useMemos() {
  const { isLoading, error } = usePersistedDomainLoad([...MEMOS_SLICES]);
  const memos = useAppStore((state) => state.memos);
  const addMemo = useAppStore((state) => state.addMemo);
  const updateMemo = useAppStore((state) => state.updateMemo);
  const deleteMemo = useAppStore((state) => state.deleteMemo);

  return {
    memos,
    addMemo,
    updateMemo,
    deleteMemo,
    isLoading,
    error,
  };
}
