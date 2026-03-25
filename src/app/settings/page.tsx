"use client";

import { ChevronDown, Loader2, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAppSettings } from "@/contexts/app-settings";
import { useDrawer } from "@/hooks/use-drawer";
import { useHeader } from "@/hooks/use-header";
import {
  clearStoredSession,
  getOAuthLoginUrl,
  getStoredSession,
  getUser,
  isSupabaseConfigured,
  readSessionFromAuthCallback,
  setStoredSession,
  signInWithEmail,
  signOut,
  signUpWithEmail,
} from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/utils/i18n";

const LANGUAGE_OPTIONS = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
] as const;

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
  const languagePickerDrawer = useDrawer();

  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);


  useHeader(
    () => ({
      title: t("settings.title"),
      eyebrow: "Preferences",
      size: "hero",
    }),
    [t],
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoadingSession(false);
      return;
    }

    const callbackSession = readSessionFromAuthCallback();
    if (callbackSession) {
      setStoredSession(callbackSession);
    }

    const loadUser = async () => {
      const session = getStoredSession();
      if (!session?.access_token) {
        setUserEmail(null);
        setIsLoadingSession(false);
        return;
      }

      try {
        const user = await getUser(session.access_token);
        setUserEmail(user.email ?? null);
      } catch {
        clearStoredSession();
        setUserEmail(null);
      } finally {
        setIsLoadingSession(false);
      }
    };

    void loadUser();
  }, []);

  const handleEmailAuth = async () => {
    if (!isSupabaseConfigured()) return;

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
        await signUpWithEmail(email.trim(), password);
        showToast(t("settings.emailVerifyHint"));
      } else {
        const sessionPayload = await signInWithEmail(email.trim(), password);
        setStoredSession({
          access_token: sessionPayload.access_token,
          refresh_token: sessionPayload.refresh_token ?? null,
          token_type: sessionPayload.token_type ?? "bearer",
          expires_at: sessionPayload.expires_in ? Math.floor(Date.now() / 1000) + Number(sessionPayload.expires_in) : null,
        });

        const user = await getUser(sessionPayload.access_token);
        setUserEmail(user.email ?? email.trim());
      }
    } catch {
      showToast(isSignUpMode ? t("settings.signUpFailed") : t("settings.loginFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "kakao") => {
    if (!isSupabaseConfigured()) return;
    setIsSubmitting(true);
    try {
      window.location.href = getOAuthLoginUrl(provider, `${window.location.origin}/settings`);
      return;
    } catch {
      showToast(provider === "google" ? t("settings.googleLoginFailed") : t("settings.kakaoLoginFailed"));
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!isSupabaseConfigured()) return;
    setIsSubmitting(true);
    const session = getStoredSession();
    try {
      if (session?.access_token) {
        await signOut(session.access_token);
      }
      clearStoredSession();
      setUserEmail(null);
    } catch {
      showToast(t("settings.logoutFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-6">
      <div className="space-y-5 px-4 py-5">
        <section className="space-y-4 rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div>
            <p className="label-text font-medium">{t("settings.systemLanguage")}</p>
            <button type="button" className="btn btn-ghost mt-2 w-full justify-between border border-base-300" onClick={languagePickerDrawer.open}>
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
          <div>
            <p className="label-text font-medium">{t("settings.account")}</p>
            {!isSupabaseConfigured() ? (
              <p className="mt-1 text-sm text-base-content/60">{t("settings.authNotConfigured")}</p>
            ) : isLoadingSession ? (
              <p className="mt-1 text-sm text-base-content/60">{t("settings.authChecking")}</p>
            ) : userEmail ? (
              <p className="mt-1 text-sm text-base-content/60">{userEmail}</p>
            ) : (
              <p className="mt-1 text-sm text-base-content/60">{t("settings.accountGuestSyncHint")}</p>
            )}
          </div>

          {isSupabaseConfigured() && !isLoadingSession && !userEmail ? (
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
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {isSignUpMode ? t("settings.signUp") : t("settings.signIn")}
              </button>

              <button
                type="button"
                className="btn btn-ghost w-full border border-base-300"
                onClick={() => setIsSignUpMode((prev) => !prev)}
                disabled={isSubmitting}
              >
                {isSignUpMode ? t("settings.switchToSignIn") : t("settings.switchToSignUp")}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="btn btn-outline" onClick={() => void handleSocialLogin("google")} disabled={isSubmitting}>
                  {t("settings.googleLogin")}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => void handleSocialLogin("kakao")} disabled={isSubmitting}>
                  {t("settings.kakaoLogin")}
                </button>
              </div>
            </div>
          ) : null}

          {isSupabaseConfigured() && userEmail ? (
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
              {option.label}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
