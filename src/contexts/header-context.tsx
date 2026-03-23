"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type HeaderConfig = {
  title?: ReactNode;
  eyebrow?: ReactNode;
  showBack?: boolean;
  actions?: ReactNode;
  content?: ReactNode;
  size?: "default" | "hero";
  className?: string;
  contentClassName?: string;
};

type HeaderContextValue = {
  header: HeaderConfig | null;
  setHeader: (config: HeaderConfig) => void;
  resetHeader: () => void;
  headerHeight: number;
  setHeaderHeight: (height: number) => void;
};

export const DEFAULT_HEADER_HEIGHT = 88;

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<HeaderConfig | null>(null);
  const [headerHeight, setHeaderHeightState] = useState(DEFAULT_HEADER_HEIGHT);

  const setHeader = useCallback((config: HeaderConfig) => {
    setHeaderState(config);
  }, []);

  const resetHeader = useCallback(() => {
    setHeaderState(null);
  }, []);

  const setHeaderHeight = useCallback((height: number) => {
    setHeaderHeightState(height > 0 ? height : DEFAULT_HEADER_HEIGHT);
  }, []);

  const value = useMemo(
    () => ({
      header,
      setHeader,
      resetHeader,
      headerHeight,
      setHeaderHeight,
    }),
    [header, headerHeight, resetHeader, setHeader, setHeaderHeight],
  );

  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
}

export function useHeaderContext() {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error("useHeaderContext must be used within HeaderProvider.");
  }
  return context;
}
