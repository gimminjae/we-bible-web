"use client";

import type { PersistStorage, StorageValue } from "zustand/middleware";

import { getActiveUserId } from "@/lib/auth-state";
import { isPersistedStateSyncPaused } from "@/lib/persist-sync-control";
import { getLocalPersistedItem, removeLocalPersistedItem, setLocalPersistedItem } from "@/lib/storage";
import { loadPersistedStateFromSupabase, queuePersistedStateSave } from "@/lib/supabase-store";
import type { PersistedState } from "@/store/app-store";

export function createAppPersistStorage<T extends PersistedState>(): PersistStorage<T> {
  return {
    getItem: async (name: string): Promise<StorageValue<T> | null> => {
      const userId = getActiveUserId();
      if (!userId) {
        return getLocalPersistedItem<T>(name);
      }

      const state = await loadPersistedStateFromSupabase(userId);
      if (!state) return null;

      return {
        state: state as T,
        version: 0,
      };
    },
    setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
      if (isPersistedStateSyncPaused()) {
        return;
      }

      const userId = getActiveUserId();
      if (!userId) {
        await setLocalPersistedItem(name, value);
        return;
      }

      await queuePersistedStateSave(userId, value.state as PersistedState);
    },
    removeItem: async (name: string): Promise<void> => {
      const userId = getActiveUserId();
      if (userId) {
        return;
      }

      await removeLocalPersistedItem(name);
    },
  };
}
