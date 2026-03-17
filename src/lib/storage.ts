import type { PersistStorage, StorageValue } from "zustand/middleware";

const memoryStorage = new Map<string, string>();

export function createSafeJsonStorage<T>(): PersistStorage<T> {
  return {
    getItem: (name: string): StorageValue<T> | null => {
      const source =
        typeof window === "undefined" ? memoryStorage.get(name) ?? null : window.localStorage.getItem(name);
      if (!source) return null;
      return JSON.parse(source) as StorageValue<T>;
    },
    setItem: (name: string, value: StorageValue<T>): void => {
      const serialized = JSON.stringify(value);
      if (typeof window === "undefined") {
        memoryStorage.set(name, serialized);
        return;
      }
      window.localStorage.setItem(name, serialized);
    },
    removeItem: (name: string): void => {
      if (typeof window === "undefined") {
        memoryStorage.delete(name);
        return;
      }
      window.localStorage.removeItem(name);
    },
  };
}
