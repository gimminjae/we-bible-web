"use client";

import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { LoadingScreen } from "@/components/ui/loading-screen";
import { ToastViewport } from "@/components/ui/toast-viewport";
import { AppSettingsProvider } from "@/contexts/app-settings";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { HeaderProvider } from "@/contexts/header-context";
import { useHydrated } from "@/hooks/use-hydrated";
import { pausePersistedStateSync, resumePersistedStateSync } from "@/lib/persist-sync-control";
import {
  getMissingPersistedSlices,
  loadPersistedSlicesFromSupabase,
  type PersistedSliceKey,
} from "@/lib/supabase-store";
import { useAppStore } from "@/store/app-store";

function getRequiredPersistedSlices(pathname: string): PersistedSliceKey[] {
  const slices = new Set<PersistedSliceKey>();

  if (pathname === "/") {
    slices.add("favorites");
    slices.add("memos");
  }

  if (pathname === "/mypage") {
    slices.add("grassData");
  }

  if (pathname.startsWith("/favorites")) {
    slices.add("favorites");
  }

  if (pathname.startsWith("/memos")) {
    slices.add("memos");
  }

  if (pathname.startsWith("/plans")) {
    slices.add("plans");
  }

  if (/^\/plans\/[^/]+$/.test(pathname)) {
    slices.add("grassData");
  }

  if (pathname.startsWith("/prayers")) {
    slices.add("prayers");
  }

  return [...slices];
}

function ProvidersGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const { dataUserId, isLoadingSession, isSyncingData } = useAuth();
  const [isLoadingRouteData, setIsLoadingRouteData] = useState(false);
  const [routeDataError, setRouteDataError] = useState<string | null>(null);
  const requiredSlices = useMemo(() => getRequiredPersistedSlices(pathname), [pathname]);

  useEffect(() => {
    let cancelled = false;

    const loadRouteData = async () => {
      if (!hydrated || isLoadingSession || isSyncingData) {
        return;
      }

      if (!dataUserId) {
        setIsLoadingRouteData(false);
        setRouteDataError(null);
        return;
      }

      const missingSlices = getMissingPersistedSlices(dataUserId, requiredSlices);
      if (!missingSlices.length) {
        setIsLoadingRouteData(false);
        setRouteDataError(null);
        return;
      }

      setIsLoadingRouteData(true);
      setRouteDataError(null);

      try {
        const patch = await loadPersistedSlicesFromSupabase(dataUserId, missingSlices);
        if (cancelled) return;

        pausePersistedStateSync();
        try {
          useAppStore.setState(patch);
        } finally {
          resumePersistedStateSync();
        }

        if (cancelled) return;
        setIsLoadingRouteData(false);
      } catch (error) {
        if (cancelled) return;

        console.warn("Failed to load page-scoped Supabase data.", error);
        setRouteDataError(error instanceof Error && error.message.trim() ? error.message : "PAGE_DATA_LOAD_FAILED");
        setIsLoadingRouteData(false);
      }
    };

    void loadRouteData();

    return () => {
      cancelled = true;
    };
  }, [dataUserId, hydrated, isLoadingSession, isSyncingData, requiredSlices]);

  if (!hydrated || isLoadingSession || isSyncingData || isLoadingRouteData) {
    const message = isLoadingRouteData ? "Loading page data..." : "Synchronizing account data...";
    return <LoadingScreen message={message} />;
  }

  if (routeDataError) {
    return <LoadingScreen message={routeDataError} />;
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppSettingsProvider>
          <HeaderProvider>
            <ProvidersGate>{children}</ProvidersGate>
            <ToastViewport />
          </HeaderProvider>
        </AppSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
