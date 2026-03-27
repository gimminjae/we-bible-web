"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { useHydrated } from "@/hooks/use-hydrated";
import { pausePersistedStateSync, resumePersistedStateSync } from "@/lib/persist-sync-control";
import {
  getMissingPersistedSlices,
  loadPersistedSlicesFromSupabase,
  type PersistedSliceKey,
} from "@/lib/supabase-store";
import { useAppStore } from "@/store/app-store";

type PersistedDomainLoadState = {
  isLoading: boolean;
  error: string | null;
};

export function usePersistedDomainLoad(requestedSlices: PersistedSliceKey[]): PersistedDomainLoadState {
  const { dataUserId, isLoadingSession, isSyncingData } = useAuth();
  const hydrated = useHydrated();
  const requestedSlicesKey = [...new Set(requestedSlices)].sort().join("|");
  const [state, setState] = useState<PersistedDomainLoadState>({
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const slices = requestedSlicesKey
      ? (requestedSlicesKey.split("|") as PersistedSliceKey[])
      : [];

    const loadDomainData = async () => {
      if (!hydrated || isLoadingSession || isSyncingData || !dataUserId) {
        if (!cancelled) {
          setState({ isLoading: false, error: null });
        }
        return;
      }

      const missingSlices = getMissingPersistedSlices(dataUserId, slices);
      if (!missingSlices.length) {
        if (!cancelled) {
          setState({ isLoading: false, error: null });
        }
        return;
      }

      if (!cancelled) {
        setState({ isLoading: true, error: null });
      }

      try {
        const patch = await loadPersistedSlicesFromSupabase(dataUserId, missingSlices);
        if (cancelled) return;

        pausePersistedStateSync();
        try {
          useAppStore.setState(patch);
        } finally {
          resumePersistedStateSync();
        }

        if (!cancelled) {
          setState({ isLoading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            isLoading: false,
            error: error instanceof Error && error.message.trim() ? error.message : "DOMAIN_DATA_LOAD_FAILED",
          });
        }
      }
    };

    void loadDomainData();

    return () => {
      cancelled = true;
    };
  }, [dataUserId, hydrated, isLoadingSession, isSyncingData, requestedSlicesKey]);

  return state;
}
