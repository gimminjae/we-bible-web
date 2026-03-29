"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Check, ChevronDown, GoogleBrand, KakaoBrand, Languages, Loader2, LogIn, LogOut, Moon, Pencil, Sun, UserPlus } from "@/components/icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAuth } from "@/contexts/auth-context";
import { useAppSettings } from "@/contexts/app-settings";
import { useDrawer } from "@/hooks/use-drawer";
import { useConfirm } from "@/hooks/use-confirm";
import { useHeader } from "@/hooks/use-header";
import { fetchUserProfile, updateMyDisplayName } from "@/lib/church";
import {
  getOAuthRedirectTo,
  getUserAccountLabel,
  getUserDisplayName,
  getUserProvider,
  type SocialProvider,
} from "@/lib/supabase";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/utils/i18n";

const LANGUAGE_OPTIONS = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
] as const;

function isValidDisplayName(displayName: string) {
  return /^[A-Za-z0-9가-힣._-]{2,20}$/.test(displayName.trim());
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/.test(password);
}

export default function SettingsPage() {
  const { theme, setTheme, appLanguage, setAppLanguage } = useAppSettings();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const languagePickerDrawer = useDrawer();
  const displayNameDrawer = useDrawer();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentUser,
    isConfigured,
    isLoadingSession,
    isSyncingData,
    lastError,
    signIn,
    signOut,
    signUp,
    clearLastError,
  } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [isLoadingDisplayName, setIsLoadingDisplayName] = useState(false);
  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);

  useHeader(
    () => ({
      title: t("settings.title"),
      eyebrow: "Preferences",
      size: "hero",
    }),
    [t],
  );

  useEffect(() => {
    const authError = searchParams.get("auth_error");
    if (!authError) return;

    showToast(t("settings.socialLoginFailed"));

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("auth_error");
    const nextQuery = nextParams.toString();

    router.replace(nextQuery ? `/settings?${nextQuery}` : "/settings", { scroll: false });
  }, [router, searchParams, showToast, t]);

  useEffect(() => {
    if (!lastError) return;
    showToast(lastError);
    clearLastError();
  }, [clearLastError, lastError, showToast]);

  useEffect(() => {
    let cancelled = false;

    const loadDisplayName = async () => {
      if (!isConfigured || !currentUser) {
        const fallbackDisplayName = getUserDisplayName(currentUser) ?? "";
        if (!cancelled) {
          setDisplayName(fallbackDisplayName);
          setDisplayNameInput(fallbackDisplayName);
          setIsLoadingDisplayName(false);
        }
        return;
      }

      setIsLoadingDisplayName(true);

      try {
        const profile = await fetchUserProfile(currentUser.id);
        if (cancelled) return;
        const nextDisplayName = profile?.displayName ?? getUserDisplayName(currentUser) ?? "";
        setDisplayName(nextDisplayName);
        setDisplayNameInput(nextDisplayName);
      } catch {
        if (cancelled) return;
        const fallbackDisplayName = getUserDisplayName(currentUser) ?? "";
        setDisplayName(fallbackDisplayName);
        setDisplayNameInput(fallbackDisplayName);
      } finally {
        if (!cancelled) {
          setIsLoadingDisplayName(false);
        }
      }
    };

    void loadDisplayName();

    return () => {
      cancelled = true;
    };
  }, [currentUser, isConfigured]);

  const handleEmailAuth = async () => {
    if (!isConfigured) return;

    if (!email.trim()) {
      showToast(t("settings.requiredEmail"));
      return;
    }

    if (!isValidEmail(email.trim())) {
      showToast(t("settings.invalidEmail"));
      return;
    }

    if (!password) {
      showToast(t("settings.requiredPassword"));
      return;
    }

    if (!isValidPassword(password)) {
      showToast(t("settings.invalidPasswordRule"));
      return;
    }

    if (isSignUpMode) {
      if (!confirmPassword) {
        showToast(t("settings.requiredConfirmPassword"));
        return;
      }

      if (password !== confirmPassword) {
        showToast(t("settings.passwordMismatch"));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isSignUpMode) {
        const result = await signUp(email.trim(), password);
        if (result.requiresEmailVerification) {
          showToast(t("settings.emailVerifyHint"));
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch {
      showToast(isSignUpMode ? t("settings.signUpFailed") : t("settings.loginFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: SocialProvider) => {
    if (!isConfigured) return;

    const supabase = createBrowserSupabaseClient();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getOAuthRedirectTo(window.location.origin, "/settings"),
        },
      });

      if (error) throw error;
    } catch {
      showToast(provider === "google" ? t("settings.googleLoginFailed") : t("settings.kakaoLoginFailed"));
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!isConfigured) return;

    const confirmed = await confirm({
      title: t("settings.logoutConfirmTitle"),
      message: t("settings.logoutConfirmMessage"),
      confirmText: t("settings.logoutConfirm"),
      cancelText: t("settings.logoutCancel"),
    });

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      await signOut();
    } catch {
      showToast(t("settings.logoutFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisplayNameSave = async () => {
    if (!currentUser) return;

    const trimmedDisplayName = displayNameInput.trim();

    if (!trimmedDisplayName) {
      showToast(t("settings.displayNameRequired"));
      return;
    }

    if (!isValidDisplayName(trimmedDisplayName)) {
      showToast(t("settings.displayNameInvalidRule"));
      return;
    }

    setIsUpdatingDisplayName(true);

    try {
      const nextDisplayName = await updateMyDisplayName(currentUser.id, trimmedDisplayName);
      setDisplayName(nextDisplayName);
      setDisplayNameInput(nextDisplayName);
      displayNameDrawer.close();
      showToast(t("settings.displayNameUpdated"));
    } catch {
      showToast(t("settings.displayNameUpdateFailed"));
    } finally {
      setIsUpdatingDisplayName(false);
    }
  };

  const userLabel =
    getUserAccountLabel(currentUser) ??
    (getUserProvider(currentUser) === "google"
      ? t("settings.googleAccountConnected")
      : getUserProvider(currentUser) === "kakao"
        ? t("settings.kakaoAccountConnected")
        : currentUser
          ? t("settings.socialAccountConnected")
          : null);

  return (
    <div className="pb-6">
      <div className="space-y-5 px-4 py-5">
        <section className="space-y-4 rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div>
            <p className="label-text font-medium">{t("settings.systemLanguage")}</p>
            <button type="button" className="btn btn-ghost mt-2 w-full justify-between border border-base-300" onClick={languagePickerDrawer.open}>
              <span className="flex items-center gap-2">
                <Languages className="size-4" />
                {LANGUAGE_OPTIONS.find((item) => item.value === appLanguage)?.label ?? "한국어"}
              </span>
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
          <div>
            <p className="label-text font-medium">{t("settings.account")}</p>
            {!isConfigured ? (
              <p className="mt-1 text-sm text-base-content/60">{t("settings.authNotConfigured")}</p>
            ) : isLoadingSession || isSyncingData ? (
              <p className="mt-1 text-sm text-base-content/60">{t("settings.authChecking")}</p>
            ) : currentUser ? (
              <p className="mt-1 text-sm text-base-content/60">{userLabel}</p>
            ) : (
              <p className="mt-1 text-sm text-base-content/60">{t("settings.accountGuestSyncHint")}</p>
            )}
          </div>

          {isConfigured && !isLoadingSession && !isSyncingData && currentUser ? (
            <div>
              <p className="label-text font-medium">{t("settings.displayNameLabel")}</p>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-[1.25rem] border border-base-300 bg-base-200 px-4 py-4">
                <p className="text-sm text-base-content/80">
                  {isLoadingDisplayName ? t("settings.authChecking") : displayName || t("settings.displayNameEmpty")}
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    setDisplayNameInput(displayName);
                    displayNameDrawer.open();
                  }}
                  disabled={isLoadingDisplayName}
                >
                  <Pencil className="size-4" />
                  {t("settings.changeDisplayName")}
                </button>
              </div>
            </div>
          ) : null}

          {isConfigured && !isLoadingSession && !isSyncingData && !currentUser ? (
            <div className="space-y-3">
              <label className="input input-bordered flex items-center gap-2">
                <span className="text-sm text-base-content/60">{t("settings.email")}</span>
                <input type="email" className="grow" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>

              <label className="input input-bordered flex items-center gap-2">
                <span className="text-sm text-base-content/60">{t("settings.password")}</span>
                <input type="password" className="grow" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>

              {isSignUpMode ? (
                <label className="input input-bordered flex items-center gap-2">
                  <span className="text-sm text-base-content/60">{t("settings.confirmPassword")}</span>
                  <input type="password" className="grow" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                </label>
              ) : null}

              <button type="button" className="btn btn-primary w-full" onClick={() => void handleEmailAuth()} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : isSignUpMode ? <UserPlus className="size-4" /> : <LogIn className="size-4" />}
                {isSignUpMode ? t("settings.signUp") : t("settings.signIn")}
              </button>

              <button
                type="button"
                className="btn btn-ghost w-full border border-base-300"
                onClick={() => setIsSignUpMode((prev) => !prev)}
                disabled={isSubmitting}
              >
                {isSignUpMode ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
                {isSignUpMode ? t("settings.switchToSignIn") : t("settings.switchToSignUp")}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="btn btn-outline" onClick={() => void handleSocialLogin("google")} disabled={isSubmitting}>
                  <GoogleBrand className="size-4" />
                  {t("settings.googleLogin")}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => void handleSocialLogin("kakao")} disabled={isSubmitting}>
                  <KakaoBrand className="size-4" />
                  {t("settings.kakaoLogin")}
                </button>
              </div>
            </div>
          ) : null}

          {isConfigured && currentUser ? (
            <button type="button" className="btn btn-outline w-full" onClick={() => void handleLogout()} disabled={isSubmitting}>
              <LogOut className="size-4" />
              {t("settings.logout")}
            </button>
          ) : null}
        </section>
      </div>

      <BottomSheet open={languagePickerDrawer.isOpen} onClose={languagePickerDrawer.close} title={t("settings.languageSelect")}>
        <div className="grid gap-2 pb-4">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`btn justify-start ${appLanguage === option.value ? "btn-primary" : "btn-ghost border border-base-300"}`}
              onClick={() => {
                setAppLanguage(option.value);
                languagePickerDrawer.close();
              }}
            >
              <Languages className="size-4" />
              {option.label}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={displayNameDrawer.isOpen}
        onClose={() => {
          if (isUpdatingDisplayName) return;
          displayNameDrawer.close();
        }}
        title={t("settings.displayNameTitle")}
      >
        <div className="space-y-4 pb-4">
          <label className="form-control gap-2">
            <span className="label-text font-medium">{t("settings.displayNameLabel")}</span>
            <input
              value={displayNameInput}
              onChange={(event) => setDisplayNameInput(event.target.value)}
              placeholder={t("settings.displayNamePlaceholder")}
              className="input input-bordered w-full"
              maxLength={20}
            />
          </label>

          <p className="text-sm text-base-content/60">{t("settings.displayNameInvalidRule")}</p>

          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={isUpdatingDisplayName}
            onClick={() => void handleDisplayNameSave()}
          >
            {isUpdatingDisplayName ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t("settings.displayNameSave")}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
