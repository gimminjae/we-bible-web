"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { TabBar } from "@/components/layout/tab-bar";
import { Header } from "@/components/ui/Header";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useHeaderContext } from "@/contexts/header-context";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAppStore } from "@/store/app-store";

const TAB_PATHS = new Set(["/", "/churches", "/mypage", "/settings"]);

export function MobileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const theme = useAppStore((state) => state.theme);
  const { headerHeight } = useHeaderContext();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  if (!hydrated) {
    return <LoadingScreen />;
  }

  const showTabBar = TAB_PATHS.has(pathname);

  return (
    <div className="min-h-screen px-0 sm:px-4 sm:py-6">
      <div className="mx-auto w-full max-w-[28rem]">
        <div className="relative min-h-screen overflow-x-hidden bg-base-100 sm:min-h-[calc(100vh-3rem)] sm:rounded-[2rem] sm:border sm:border-base-300 sm:shadow-2xl sm:shadow-stone-950/10">
          <Header />
          <main className={showTabBar ? "pb-28" : ""} style={{ paddingTop: headerHeight }}>
            {children}
          </main>
          {showTabBar ? <TabBar /> : null}
        </div>
      </div>
    </div>
  );
}
