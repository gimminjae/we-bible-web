"use client";

import type { ReactNode } from "react";

import { useAppStore, type AppLanguage, type AppTheme } from "@/store/app-store";

type AppSettingsValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  appLanguage: AppLanguage;
  setAppLanguage: (language: AppLanguage) => void;
};

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useOptionalAppSettings(): AppSettingsValue {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const appLanguage = useAppStore((state) => state.appLanguage);
  const setAppLanguage = useAppStore((state) => state.setAppLanguage);
  return { theme, setTheme, appLanguage, setAppLanguage };
}

export function useAppSettings(): AppSettingsValue {
  return useOptionalAppSettings();
}
