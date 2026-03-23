"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { ToastViewport } from "@/components/ui/toast-viewport";
import { AppSettingsProvider } from "@/contexts/app-settings";
import { HeaderProvider } from "@/contexts/header-context";
import { useAppStore } from "@/store/app-store";

function StoreHydrator() {
  const setHasHydrated = useAppStore((state) => state.setHasHydrated);

  useEffect(() => {
    Promise.resolve(useAppStore.persist.rehydrate()).then(() => {
      setHasHydrated(true);
    });
  }, [setHasHydrated]);

  return null;
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
      <AppSettingsProvider>
        <HeaderProvider>
          <StoreHydrator />
          {children}
          <ToastViewport />
        </HeaderProvider>
      </AppSettingsProvider>
    </QueryClientProvider>
  );
}
