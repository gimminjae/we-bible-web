import type { PersistStorage, StorageValue } from "zustand/middleware";

const memoryStorage = new Map<string, string>();

const DATABASE_NAME = "we_bible_web";
const DATABASE_VERSION = "1.0";
const DATABASE_DESCRIPTION = "we-bible-web persisted state";
const DATABASE_SIZE = 5 * 1024 * 1024;
const TABLE_NAME = "app_storage";
const LEGACY_LOCAL_STORAGE_KEY = "we-bible-web-storage";

type WebSqlResultSetRowList = {
  readonly length: number;
  item: (index: number) => { key: string; value: string };
};

type WebSqlResultSet = {
  rows: WebSqlResultSetRowList;
};

type WebSqlTransaction = {
  executeSql: (
    sqlStatement: string,
    args?: unknown[],
    successCallback?: (transaction: WebSqlTransaction, resultSet: WebSqlResultSet) => void,
    errorCallback?: (transaction: WebSqlTransaction, error: unknown) => boolean | void,
  ) => void;
};

type WebSqlDatabase = {
  transaction: (
    callback: (transaction: WebSqlTransaction) => void,
    errorCallback?: (error: unknown) => void,
    successCallback?: () => void,
  ) => void;
};

declare global {
  interface Window {
    openDatabase?: (
      name: string,
      version: string,
      displayName: string,
      estimatedSize: number,
    ) => WebSqlDatabase;
  }
}

let dbPromise: Promise<WebSqlDatabase | null> | null = null;
let legacyMigrationPromise: Promise<void> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getLocalStorageValue(name: string): string | null {
  if (!isBrowser()) {
    return memoryStorage.get(name) ?? null;
  }

  return window.localStorage.getItem(name);
}

function setLocalStorageValue(name: string, value: string): void {
  if (!isBrowser()) {
    memoryStorage.set(name, value);
    return;
  }

  window.localStorage.setItem(name, value);
}

function removeLocalStorageValue(name: string): void {
  if (!isBrowser()) {
    memoryStorage.delete(name);
    return;
  }

  window.localStorage.removeItem(name);
}

function getWebSqlDatabase(): Promise<WebSqlDatabase | null> {
  if (!isBrowser() || typeof window.openDatabase !== "function") {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const database = window.openDatabase?.(
          DATABASE_NAME,
          DATABASE_VERSION,
          DATABASE_DESCRIPTION,
          DATABASE_SIZE,
        );

        if (!database) {
          resolve(null);
          return;
        }

        database.transaction(
          (transaction) => {
            transaction.executeSql(
              `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)`,
            );
          },
          reject,
          () => resolve(database),
        );
      } catch (error) {
        reject(error);
      }
    }).catch((error) => {
      console.warn("Failed to initialize Web SQL persistence.", error);
      return null;
    });
  }

  return dbPromise;
}

function runSql<T>(
  database: WebSqlDatabase,
  sql: string,
  args: unknown[],
  mapResult: (resultSet: WebSqlResultSet) => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    database.transaction((transaction) => {
      transaction.executeSql(
        sql,
        args,
        (_transaction, resultSet) => resolve(mapResult(resultSet)),
        (_transaction, error) => {
          reject(error);
          return true;
        },
      );
    }, reject);
  });
}

async function migrateLegacyLocalStorage(database: WebSqlDatabase): Promise<void> {
  if (!isBrowser()) return;

  const legacyValue = window.localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
  if (!legacyValue) return;

  const existingValue = await runSql(
    database,
    `SELECT value FROM ${TABLE_NAME} WHERE key = ? LIMIT 1`,
    [LEGACY_LOCAL_STORAGE_KEY],
    (resultSet) => (resultSet.rows.length ? resultSet.rows.item(0).value : null),
  );

  if (existingValue) {
    window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
    return;
  }

  await runSql(
    database,
    `INSERT OR REPLACE INTO ${TABLE_NAME} (key, value) VALUES (?, ?)`,
    [LEGACY_LOCAL_STORAGE_KEY, legacyValue],
    () => undefined,
  );

  window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
}

async function ensureLegacyMigration(database: WebSqlDatabase): Promise<void> {
  if (!legacyMigrationPromise) {
    legacyMigrationPromise = migrateLegacyLocalStorage(database).catch((error) => {
      console.warn("Failed to migrate legacy localStorage state into Web SQL.", error);
    });
  }

  await legacyMigrationPromise;
}

export function createSafeJsonStorage<T>(): PersistStorage<T> {
  return {
    getItem: async (name: string): Promise<StorageValue<T> | null> => {
      if (!isBrowser()) {
        const source = getLocalStorageValue(name);
        return source ? (JSON.parse(source) as StorageValue<T>) : null;
      }

      const database = await getWebSqlDatabase();
      if (!database) {
        const source = getLocalStorageValue(name);
        return source ? (JSON.parse(source) as StorageValue<T>) : null;
      }

      await ensureLegacyMigration(database);

      const source = await runSql(
        database,
        `SELECT value FROM ${TABLE_NAME} WHERE key = ? LIMIT 1`,
        [name],
        (resultSet) => (resultSet.rows.length ? resultSet.rows.item(0).value : null),
      );

      return source ? (JSON.parse(source) as StorageValue<T>) : null;
    },
    setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
      const serialized = JSON.stringify(value);

      if (!isBrowser()) {
        setLocalStorageValue(name, serialized);
        return;
      }

      const database = await getWebSqlDatabase();
      if (!database) {
        setLocalStorageValue(name, serialized);
        return;
      }

      await ensureLegacyMigration(database);

      await runSql(
        database,
        `INSERT OR REPLACE INTO ${TABLE_NAME} (key, value) VALUES (?, ?)`,
        [name, serialized],
        () => undefined,
      );
    },
    removeItem: async (name: string): Promise<void> => {
      if (!isBrowser()) {
        removeLocalStorageValue(name);
        return;
      }

      const database = await getWebSqlDatabase();
      if (!database) {
        removeLocalStorageValue(name);
        return;
      }

      await ensureLegacyMigration(database);

      await runSql(database, `DELETE FROM ${TABLE_NAME} WHERE key = ?`, [name], () => undefined);
    },
  };
}
