"use client";

import { ChevronDown, Download, Moon, Sun, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAppSettings } from "@/contexts/app-settings";
import { buildBackupPayload, downloadBackup, readBackupFile } from "@/lib/backup";
import { useToast } from "@/hooks/use-toast";
import { initialPersistedState, useAppStore, type PersistedState } from "@/store/app-store";
import { useI18n } from "@/utils/i18n";

const LANGUAGE_OPTIONS = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
] as const;

export default function SettingsPage() {
  const { theme, setTheme, appLanguage, setAppLanguage } = useAppSettings();
  const { t } = useI18n();
  const { showToast } = useToast();
  const replacePersistedState = useAppStore((state) => state.replacePersistedState);
  const storeState = useAppStore((state) => ({
    theme: state.theme,
    appLanguage: state.appLanguage,
    bible: state.bible,
    favorites: state.favorites,
    memos: state.memos,
    prayers: state.prayers,
    plans: state.plans,
    grassData: state.grassData,
    grassTheme: state.grassTheme,
    stepRewardUsedDate: state.stepRewardUsedDate,
  }));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    downloadBackup(buildBackupPayload(storeState as PersistedState).data);
    showToast(t("settings.exportSuccess"));
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const payload = await readBackupFile(file);
      replacePersistedState({
        ...initialPersistedState,
        ...payload.data,
      });
      showToast(t("settings.importSuccess"));
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("settings.importFailed"));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-5 px-4 py-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.28em] text-base-content/45">Preferences</p>
        <h1 className="text-3xl font-semibold">{t("settings.title")}</h1>
      </div>

      <section className="space-y-4 rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
        <div>
          <p className="label-text font-medium">{t("settings.systemLanguage")}</p>
          <button type="button" className="btn btn-ghost mt-2 w-full justify-between border border-base-300" onClick={() => setLanguagePickerOpen(true)}>
            <span>{LANGUAGE_OPTIONS.find((item) => item.value === appLanguage)?.label ?? "한국어"}</span>
            <ChevronDown className="size-4" />
          </button>
        </div>

        <div>
          <p className="label-text font-medium">{t("settings.theme")}</p>
          <button
            type="button"
            className="btn btn-ghost mt-2 w-full justify-between border border-base-300"
            onClick={() => setTheme(theme === "light" ? "night" : "light")}
          >
            <span>{theme === "light" ? t("settings.lightMode") : t("settings.darkMode")}</span>
            {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="label-text font-medium">{t("settings.account")}</p>
            <p className="mt-1 text-sm text-base-content/60">{t("settings.exportDesc")}</p>
          </div>
          <button type="button" className="btn btn-sm btn-ghost border border-base-300" onClick={() => setGuideOpen(true)}>
            {t("common.confirm")}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-primary" onClick={handleExport}>
            <Download className="size-4" />
            {t("settings.exportDb")}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            <Upload className="size-4" />
            {isImporting ? t("settings.importing") : t("settings.importDb")}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(event) => void handleImport(event)} />
      </section>

      <BottomSheet open={languagePickerOpen} onClose={() => setLanguagePickerOpen(false)} title={t("settings.languageSelect")}>
        <div className="grid gap-2 pb-4">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`btn justify-start ${appLanguage === option.value ? "btn-primary" : "btn-ghost border border-base-300"}`}
              onClick={() => {
                setAppLanguage(option.value);
                setLanguagePickerOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={guideOpen} onClose={() => setGuideOpen(false)} title={t("settings.exportImportGuideTitle")}>
        <div className="pb-4 text-sm leading-7 text-base-content/70">{t("settings.exportImportGuideBody")}</div>
      </BottomSheet>
    </div>
  );
}
