"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { LoadingScreen } from "@/components/ui/loading-screen";
import { ToastViewport } from "@/components/ui/toast-viewport";
import { AppSettingsProvider } from "@/contexts/app-settings";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { HeaderProvider } from "@/contexts/header-context";
import { useHydrated } from "@/hooks/use-hydrated";

function ProvidersGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const { isLoadingSession, isSyncingData } = useAuth();

  if (!hydrated || isLoadingSession || isSyncingData) {
    return <LoadingScreen message="Synchronizing account data..." />;
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
