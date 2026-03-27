"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { setActiveUserId } from "@/lib/auth-state";
import { bootstrapSupabaseUserData } from "@/lib/supabase-store";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createInitialPersistedState, pickPersistedState, useAppStore } from "@/store/app-store";

type AuthContextValue = {
  currentUser: User | null;
  dataUserId: string | null;
  isConfigured: boolean;
  isLoadingSession: boolean;
  isSyncingData: boolean;
  lastError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ requiresEmailVerification: boolean }>;
  signOut: () => Promise<void>;
  clearLastError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "AUTH_OPERATION_FAILED";
}

async function rehydratePersistedStore(): Promise<void> {
  const store = useAppStore.getState();
  store.setHasHydrated(false);
  store.replacePersistedState(createInitialPersistedState());
  await Promise.resolve(useAppStore.persist.rehydrate());
  useAppStore.getState().setHasHydrated(true);
}

function getLocalPersistedSnapshot() {
  return pickPersistedState(useAppStore.getState());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dataUserId, setDataUserId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  const configured = isSupabaseConfigured();

  const resetToGuest = useCallback(() => {
    setCurrentUser(null);
    setDataUserId(null);
    setActiveUserId(null);
  }, []);

  const syncAuthenticatedUser = useCallback(
    async (user: User) => {
      setCurrentUser(user);
      setIsSyncingData(true);

      try {
        const localSnapshot = getLocalPersistedSnapshot();
        await bootstrapSupabaseUserData(user.id, localSnapshot);
        setActiveUserId(user.id);
        await rehydratePersistedStore();
        if (!mountedRef.current) return;
        setDataUserId(user.id);
        setLastError(null);
      } catch (error) {
        if (!mountedRef.current) return;
        const message = getErrorMessage(error);
        resetToGuest();
        await rehydratePersistedStore();
        setLastError(message);

        const supabase = createBrowserSupabaseClient();
        const result = await supabase.auth.signOut();
        if (result.error) {
          console.warn("Failed to sign out after sync bootstrap error.", result.error);
        }
      } finally {
        if (!mountedRef.current) return;
        setIsSyncingData(false);
        setIsLoadingSession(false);
      }
    },
    [resetToGuest],
  );

  const enqueueUserSync = useCallback(
    (user: User | null) => {
      syncQueueRef.current = syncQueueRef.current
        .catch(() => {
          // Keep the sync queue usable after a previous failure.
        })
        .then(async () => {
          if (!mountedRef.current) return;

          if (!user) {
            resetToGuest();
            await rehydratePersistedStore();
            if (!mountedRef.current) return;
            setIsSyncingData(false);
            setIsLoadingSession(false);
            return;
          }

          await syncAuthenticatedUser(user);
        });

      return syncQueueRef.current;
    },
    [resetToGuest, syncAuthenticatedUser],
  );

  useEffect(() => {
    mountedRef.current = true;
    let unsubscribe: () => void = () => {};

    const initialize = async () => {
      try {
        await rehydratePersistedStore();
      } catch (error) {
        console.warn("Failed to hydrate local persisted store before auth bootstrap.", error);
        useAppStore.getState().setHasHydrated(true);
      }

      if (!mountedRef.current) return;

      if (!configured) {
        resetToGuest();
        setIsLoadingSession(false);
        setIsSyncingData(false);
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.getUser();
      if (!mountedRef.current) return;

      if (error) {
        console.warn("Failed to load current Supabase user.", error);
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        void enqueueUserSync(session?.user ?? null);
      });
      unsubscribe = () => subscription.unsubscribe();

      await enqueueUserSync(error ? null : data.user ?? null);
    };

    void initialize();

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [configured, enqueueUserSync, resetToGuest]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createBrowserSupabaseClient();
    setLastError(null);
    setIsLoadingSession(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setIsLoadingSession(false);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = createBrowserSupabaseClient();
    setLastError(null);
    setIsLoadingSession(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) {
      setIsLoadingSession(false);
      throw error;
    }
    if (!data.session?.user) {
      setIsLoadingSession(false);
    }
    return {
      requiresEmailVerification: !data.session?.user,
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    setLastError(null);
    setIsLoadingSession(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setIsLoadingSession(false);
      throw error;
    }
  }, []);

  const clearLastError = useCallback(() => {
    setLastError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      dataUserId,
      isConfigured: configured,
      isLoadingSession,
      isSyncingData,
      lastError,
      signIn,
      signUp,
      signOut,
      clearLastError,
    }),
    [
      clearLastError,
      configured,
      currentUser,
      dataUserId,
      isLoadingSession,
      isSyncingData,
      lastError,
      signIn,
      signOut,
      signUp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
