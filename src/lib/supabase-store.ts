"use client";

import type { BibleLang, BibleSearchInfo, FavoriteVerseRecord } from "@/components/bible/types";
import type { GrassColorTheme, GrassDayEntry } from "@/lib/grass";
import {
  BIBLE_BOOKS,
  calcCurrentReadCount,
  calcGoalPercent,
  calcReadCountPerDay,
  calcRestDay,
  calcTotalReadCount,
  createEmptyGoalStatus,
  updatePlanComputedFields,
  type GoalStatus,
  type PlanRecord,
} from "@/lib/plan";
import { removeLocalPersistedItem } from "@/lib/storage";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import {
  APP_STORE_PERSIST_KEY,
  createInitialPersistedState,
  pickPersistedState,
  type MemoRecord,
  type PersistedState,
  type PrayerContent,
  type PrayerRecord,
} from "@/store/app-store";

export const USER_BIBLE_STATE_TABLE = "bible_state";
export const USER_FAVORITES_TABLE = "favorite_verses";
export const USER_MEMOS_TABLE = "memos";
export const USER_MEMO_VERSES_TABLE = "memo_verses";
export const USER_PLANS_TABLE = "plans";
export const USER_PRAYERS_TABLE = "prayers";
export const USER_PRAYER_CONTENTS_TABLE = "prayer_contents";
export const USER_GRASS_TABLE = "bible_grass";
const GRASS_META_ROW_DATE = "__meta__";
const WEB_SUPABASE_SCHEMA_PATH = "C:\\Users\\minja\\mylists\\we-bible-web\\supabase\\schema.sql";

type StateRow = {
  key: string;
  value: unknown;
};

type FavoriteRow = {
  book_code: string;
  chapter: number;
  verse: number;
  verse_text: string | null;
  created_at: string | null;
};

type MemoRow = {
  id: number;
  client_id: string | null;
  title: string | null;
  content: string | null;
  verse_text: string | null;
  created_at: string | null;
};

type MemoVerseRow = {
  memo_id: number;
  book_code: string;
  chapter: number;
  verse: number;
};

type PlanRow = {
  id: number;
  client_id: string | null;
  plan_name: string | null;
  start_date: string | null;
  end_date: string | null;
  total_read_count: number | null;
  current_read_count: number | null;
  goal_percent: number | null;
  read_count_per_day: number | null;
  rest_day: number | null;
  goal_status: unknown;
  selected_book_codes: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type PrayerRow = {
  id: number;
  client_id: string | null;
  requester: string | null;
  target: string | null;
  created_at: string | null;
};

type PrayerContentRow = {
  id: number;
  client_id: string | null;
  prayer_id: number;
  content: string | null;
  registered_at: string | null;
};

type GrassRow = {
  date: string;
  data: unknown;
};

export type PersistedSliceKey = "appState" | "favorites" | "memos" | "plans" | "prayers" | "grassData";

type PersistedSliceSignatures = Record<PersistedSliceKey, string>;
type PersistedSliceSignatureCache = Partial<PersistedSliceSignatures>;

let persistWriteQueue: Promise<void> = Promise.resolve();
const persistedSliceSignaturesByUser = new Map<string, PersistedSliceSignatureCache>();
const PERSISTED_SLICE_KEYS: PersistedSliceKey[] = ["appState", "favorites", "memos", "plans", "prayers", "grassData"];

type SupabaseLikeError = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

function toErrorMessagePart(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeSupabaseError(error: unknown): Error {
  if (error instanceof Error) return error;

  if (error && typeof error === "object") {
    const candidate = error as SupabaseLikeError;
    const code = toErrorMessagePart(candidate.code);
    const message = toErrorMessagePart(candidate.message);
    const details = toErrorMessagePart(candidate.details);
    const hint = toErrorMessagePart(candidate.hint);

    if (code === "PGRST205" && message?.includes("Could not find the table")) {
      return new Error(
        `Supabase schema is missing required tables. Apply ${WEB_SUPABASE_SCHEMA_PATH}. Original error: ${message}${hint ? ` (${hint})` : ""}`,
      );
    }

    const parts = [message, details, hint].filter((value): value is string => Boolean(value));
    if (parts.length > 0) {
      return new Error(parts.join(" | "));
    }
  }

  return new Error("SUPABASE_DATA_SYNC_FAILED");
}

function throwSupabaseError(error: unknown): never {
  throw normalizeSupabaseError(error);
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isBibleLang(value: unknown): value is BibleLang {
  return value === "ko" || value === "en" || value === "de";
}

function isAppLanguage(value: unknown): value is PersistedState["appLanguage"] {
  return value === "ko" || value === "en";
}

function isGrassTheme(value: unknown): value is GrassColorTheme {
  return (
    value === "green" ||
    value === "yellow" ||
    value === "orange" ||
    value === "red" ||
    value === "blue" ||
    value === "purple" ||
    value === "sky"
  );
}

function parseJsonText<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      return (JSON.parse(value) as T) ?? fallback;
    } catch {
      return fallback;
    }
  }

  if (value == null) return fallback;
  return value as T;
}

function toRemoteTheme(theme: PersistedState["theme"]): "light" | "dark" {
  return theme === "night" ? "dark" : "light";
}

function fromRemoteTheme(value: unknown): PersistedState["theme"] {
  return value === "dark" || value === "night" ? "night" : "light";
}

function normalizeBibleState(raw: unknown, fallback: PersistedState["bible"]): PersistedState["bible"] {
  if (!raw || typeof raw !== "object") return fallback;

  const value = raw as Partial<BibleSearchInfo>;
  return {
    bookCode: typeof value.bookCode === "string" ? value.bookCode : fallback.bookCode,
    chapter: Math.max(1, Math.floor(toNumber(value.chapter, fallback.chapter))),
    primaryLang: isBibleLang(value.primaryLang) ? value.primaryLang : fallback.primaryLang,
    secondaryLang: isBibleLang(value.secondaryLang) ? value.secondaryLang : fallback.secondaryLang,
    dualLang: value.dualLang === true,
    fontScale: Math.max(0.8, Math.min(1.4, toNumber(value.fontScale, fallback.fontScale))),
  };
}

function normalizeGrassDayValue(date: string, raw: unknown): { date: string; data: GrassDayEntry[]; fillYn: boolean } {
  const parsed = parseJsonText<unknown>(raw, []);

  if (Array.isArray(parsed)) {
    return {
      date,
      data: parsed as GrassDayEntry[],
      fillYn: false,
    };
  }

  if (typeof parsed === "object" && parsed !== null) {
    const row = parsed as { date?: unknown; data?: unknown; fillYn?: unknown };
    return {
      date: typeof row.date === "string" ? row.date : date,
      data: Array.isArray(row.data) ? (row.data as GrassDayEntry[]) : [],
      fillYn: row.fillYn === true,
    };
  }

  return {
    date,
    data: [],
    fillYn: false,
  };
}

function createPlanRecordFromRow(row: PlanRow): PlanRecord {
  const selectedBookCodes = parseJsonText<string[]>(row.selected_book_codes, []).filter(
    (value): value is string => typeof value === "string",
  );
  const parsedGoalStatus = parseJsonText<GoalStatus>(row.goal_status, createEmptyGoalStatus());
  const goalStatus = BIBLE_BOOKS.map((book, bookIndex) => {
    const source = Array.isArray(parsedGoalStatus[bookIndex]) ? parsedGoalStatus[bookIndex] : [];
    return Array.from({ length: book.maxChapter }, (_entry, chapterIndex) => {
      const value = source[chapterIndex];
      return value === 1 ? 1 : 0;
    });
  });

  return updatePlanComputedFields({
    id: row.client_id?.trim() || String(row.id),
    planName: row.plan_name ?? "",
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    totalReadCount: Math.max(0, Math.floor(toNumber(row.total_read_count, calcTotalReadCount(selectedBookCodes)))),
    currentReadCount: Math.max(0, Math.floor(toNumber(row.current_read_count, calcCurrentReadCount(goalStatus, selectedBookCodes)))),
    goalPercent: toNumber(row.goal_percent, calcGoalPercent(calcTotalReadCount(selectedBookCodes), calcCurrentReadCount(goalStatus, selectedBookCodes))),
    readCountPerDay: toNumber(
      row.read_count_per_day,
      calcReadCountPerDay(calcTotalReadCount(selectedBookCodes), calcCurrentReadCount(goalStatus, selectedBookCodes), calcRestDay(row.end_date ?? "")),
    ),
    restDay: Math.max(0, Math.floor(toNumber(row.rest_day, calcRestDay(row.end_date ?? "")))),
    goalStatus,
    selectedBookCodes,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? "",
  });
}

function buildStateRows(state: PersistedState) {
  return [
    {
      key: "appTheme",
      value: toRemoteTheme(state.theme),
    },
    {
      key: "appLanguage",
      value: state.appLanguage,
    },
    {
      key: "bibleSearchInfo",
      value: state.bible,
    },
  ];
}

function getAppStateSlice(state: PersistedState) {
  return {
    theme: state.theme,
    appLanguage: state.appLanguage,
    bible: state.bible,
  };
}

function getGrassSlice(state: PersistedState) {
  return {
    grassData: state.grassData,
    grassTheme: state.grassTheme,
    stepRewardUsedDate: state.stepRewardUsedDate,
  };
}

function buildPersistedSliceSignatures(state: PersistedState): PersistedSliceSignatures {
  return {
    appState: JSON.stringify(getAppStateSlice(state)),
    favorites: JSON.stringify(state.favorites),
    memos: JSON.stringify(state.memos),
    plans: JSON.stringify(state.plans),
    prayers: JSON.stringify(state.prayers),
    grassData: JSON.stringify(getGrassSlice(state)),
  };
}

function createInitialSlicePatch(requestedSlices: PersistedSliceKey[]): Partial<PersistedState> {
  const initial = createInitialPersistedState();
  const patch: Partial<PersistedState> = {};

  for (const slice of requestedSlices) {
    switch (slice) {
      case "appState":
        patch.theme = initial.theme;
        patch.appLanguage = initial.appLanguage;
        patch.bible = initial.bible;
        break;
      case "favorites":
        patch.favorites = initial.favorites;
        break;
      case "memos":
        patch.memos = initial.memos;
        break;
      case "plans":
        patch.plans = initial.plans;
        break;
      case "prayers":
        patch.prayers = initial.prayers;
        break;
      case "grassData":
        patch.grassData = initial.grassData;
        patch.grassTheme = initial.grassTheme;
        patch.stepRewardUsedDate = initial.stepRewardUsedDate;
        break;
      default:
        break;
    }
  }

  return patch;
}

function cachePersistedSliceSignatures(
  userId: string,
  state: PersistedState,
  slices: PersistedSliceKey[] = PERSISTED_SLICE_KEYS,
): PersistedSliceSignatureCache {
  const signatures = buildPersistedSliceSignatures(state);
  const existing = persistedSliceSignaturesByUser.get(userId) ?? {};
  const nextCache: PersistedSliceSignatureCache = { ...existing };

  for (const slice of slices) {
    nextCache[slice] = signatures[slice];
  }

  persistedSliceSignaturesByUser.set(userId, nextCache);
  return nextCache;
}

function getChangedPersistedSlices(
  previous: PersistedSliceSignatureCache | null | undefined,
  next: PersistedSliceSignatures,
): PersistedSliceKey[] {
  if (!previous) return [];
  return PERSISTED_SLICE_KEYS.filter((key) => previous[key] != null && previous[key] !== next[key]);
}

export function getMissingPersistedSlices(userId: string, requestedSlices: PersistedSliceKey[]): PersistedSliceKey[] {
  const cachedSlices = persistedSliceSignaturesByUser.get(userId) ?? {};
  return requestedSlices.filter((slice) => cachedSlices[slice] == null);
}

async function savePersistedSlicesToSupabase(
  userId: string,
  snapshot: PersistedState,
  changedSlices: PersistedSliceKey[],
): Promise<void> {
  for (const slice of changedSlices) {
    switch (slice) {
      case "appState":
        await replaceStateRows(userId, snapshot);
        break;
      case "favorites":
        await replaceFavorites(userId, snapshot.favorites);
        break;
      case "memos":
        await replaceMemos(userId, snapshot.memos);
        break;
      case "plans":
        await replacePlans(userId, snapshot.plans);
        break;
      case "prayers":
        await replacePrayers(userId, snapshot.prayers);
        break;
      case "grassData":
        await replaceGrass(userId, snapshot);
        break;
      default:
        break;
    }
  }
}

async function hasRemoteRows(userId: string): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  const checks = await Promise.all([
    supabase.from(USER_BIBLE_STATE_TABLE).select("key").eq("user_id", userId).limit(1),
    supabase.from(USER_FAVORITES_TABLE).select("verse").eq("user_id", userId).limit(1),
    supabase.from(USER_MEMOS_TABLE).select("id").eq("user_id", userId).limit(1),
    supabase.from(USER_PLANS_TABLE).select("id").eq("user_id", userId).limit(1),
    supabase.from(USER_PRAYERS_TABLE).select("id").eq("user_id", userId).limit(1),
    supabase.from(USER_GRASS_TABLE).select("date").eq("user_id", userId).limit(1),
  ]);

  for (const result of checks) {
    if (result.error) throw result.error;
    if ((result.data?.length ?? 0) > 0) return true;
  }

  return false;
}

async function replaceStateRows(userId: string, state: PersistedState): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const payload = buildStateRows(state).map((row) => ({
    user_id: userId,
    key: row.key,
    value: row.value,
  }));

  if (payload.length > 0) {
    const { error } = await supabase.from(USER_BIBLE_STATE_TABLE).upsert(payload, {
      onConflict: "user_id,key",
    });
    if (error) throwSupabaseError(error);
  }
}

async function replaceFavorites(userId: string, favorites: FavoriteVerseRecord[]): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error: deleteError } = await supabase.from(USER_FAVORITES_TABLE).delete().eq("user_id", userId);
  if (deleteError) throwSupabaseError(deleteError);

  if (!favorites.length) return;

  const payload = favorites.map((favorite) => ({
    user_id: userId,
    book_code: favorite.bookCode,
    chapter: favorite.chapter,
    verse: favorite.verse,
    verse_text: favorite.verseText,
    created_at: favorite.createdAt,
  }));

  const { error } = await supabase.from(USER_FAVORITES_TABLE).insert(payload);
  if (error) throwSupabaseError(error);
}

async function replaceMemos(userId: string, memos: MemoRecord[]): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error: deleteMemoVersesError } = await supabase.from(USER_MEMO_VERSES_TABLE).delete().eq("user_id", userId);
  if (deleteMemoVersesError) throwSupabaseError(deleteMemoVersesError);

  const { error: deleteMemosError } = await supabase.from(USER_MEMOS_TABLE).delete().eq("user_id", userId);
  if (deleteMemosError) throwSupabaseError(deleteMemosError);

  if (!memos.length) return;

  const memoIdMap = new Map<string, number>();

  for (const memo of memos) {
    const { data, error } = await supabase
      .from(USER_MEMOS_TABLE)
      .insert({
        user_id: userId,
        client_id: memo.id,
        title: memo.title,
        content: memo.content,
        verse_text: memo.verseText,
        created_at: memo.createdAt,
      })
      .select("id")
      .single();

    if (error) throwSupabaseError(error);
    memoIdMap.set(memo.id, toNumber(data?.id));
  }

  const versePayload = memos.flatMap((memo) => {
    if (!memo.bookCode || typeof memo.chapter !== "number" || !memo.verseNumbers?.length) {
      return [];
    }

    const memoId = memoIdMap.get(memo.id);
    if (!memoId) return [];

    return memo.verseNumbers.map((verse) => ({
      user_id: userId,
      memo_id: memoId,
      book_code: memo.bookCode!,
      chapter: memo.chapter!,
      verse,
    }));
  });

  if (!versePayload.length) return;

  const { error } = await supabase.from(USER_MEMO_VERSES_TABLE).insert(versePayload);
  if (error) throwSupabaseError(error);
}

async function replacePlans(userId: string, plans: PlanRecord[]): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error: deleteError } = await supabase.from(USER_PLANS_TABLE).delete().eq("user_id", userId);
  if (deleteError) throwSupabaseError(deleteError);

  if (!plans.length) return;

  const payload = plans.map((plan) => ({
    user_id: userId,
    client_id: plan.id,
    plan_name: plan.planName,
    start_date: plan.startDate,
    end_date: plan.endDate,
    total_read_count: plan.totalReadCount,
    current_read_count: plan.currentReadCount,
    goal_percent: plan.goalPercent,
    read_count_per_day: plan.readCountPerDay,
    rest_day: plan.restDay,
    goal_status: plan.goalStatus,
    selected_book_codes: plan.selectedBookCodes,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
  }));

  const { error } = await supabase.from(USER_PLANS_TABLE).insert(payload);
  if (error) throwSupabaseError(error);
}

async function replacePrayers(userId: string, prayers: PrayerRecord[]): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { data: existingPrayers, error: existingPrayersError } = await supabase
    .from(USER_PRAYERS_TABLE)
    .select("id")
    .eq("user_id", userId);
  if (existingPrayersError) throwSupabaseError(existingPrayersError);

  const existingPrayerIds = (existingPrayers ?? [])
    .map((row) => toNumber((row as { id?: unknown }).id, NaN))
    .filter((value) => Number.isFinite(value));

  if (existingPrayerIds.length > 0) {
    const { error: deleteContentsError } = await supabase
      .from(USER_PRAYER_CONTENTS_TABLE)
      .delete()
      .in("prayer_id", existingPrayerIds);
    if (deleteContentsError) throwSupabaseError(deleteContentsError);
  }

  const { error: deletePrayersError } = await supabase.from(USER_PRAYERS_TABLE).delete().eq("user_id", userId);
  if (deletePrayersError) throwSupabaseError(deletePrayersError);

  if (!prayers.length) return;

  const prayerIdMap = new Map<string, number>();

  for (const prayer of prayers) {
    const { data, error } = await supabase
      .from(USER_PRAYERS_TABLE)
      .insert({
        user_id: userId,
        client_id: prayer.id,
        requester: prayer.requester,
        target: prayer.target,
        created_at: prayer.createdAt,
      })
      .select("id")
      .single();

    if (error) throwSupabaseError(error);
    prayerIdMap.set(prayer.id, toNumber(data?.id));
  }

  const contentsPayload = prayers.flatMap((prayer) => {
    const prayerId = prayerIdMap.get(prayer.id);
    if (!prayerId) return [];

    return prayer.contents.map((content) => ({
      prayer_id: prayerId,
      client_id: content.id,
      content: content.content,
      registered_at: content.registeredAt,
    }));
  });

  if (!contentsPayload.length) return;

  const { error } = await supabase.from(USER_PRAYER_CONTENTS_TABLE).insert(contentsPayload);
  if (error) throwSupabaseError(error);
}

async function replaceGrass(userId: string, state: PersistedState): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error: deleteError } = await supabase.from(USER_GRASS_TABLE).delete().eq("user_id", userId);
  if (deleteError) throwSupabaseError(deleteError);

  const payload: Array<{ user_id: string; date: string; data: unknown }> = Object.values(state.grassData).map((day) => ({
    user_id: userId,
    date: day.date,
    data: {
      date: day.date,
      data: day.data,
      fillYn: day.fillYn,
    },
  }));

  payload.push({
    user_id: userId,
    date: GRASS_META_ROW_DATE,
    data: {
      type: "meta",
      grassTheme: state.grassTheme,
      stepRewardUsedDate: state.stepRewardUsedDate,
    },
  });

  if (!payload.length) return;

  const { error } = await supabase.from(USER_GRASS_TABLE).insert(payload);
  if (error) throwSupabaseError(error);
}

export async function savePersistedStateToSupabase(userId: string, state: PersistedState): Promise<void> {
  const snapshot = pickPersistedState(state);
  await savePersistedSlicesToSupabase(userId, snapshot, PERSISTED_SLICE_KEYS);
  cachePersistedSliceSignatures(userId, snapshot);
}

export function queuePersistedStateSave(userId: string, state: PersistedState): Promise<void> {
  const snapshot = pickPersistedState(state);
  const nextSignatures = buildPersistedSliceSignatures(snapshot);

  persistWriteQueue = persistWriteQueue.catch(() => undefined).then(async () => {
    const previousSignatures = persistedSliceSignaturesByUser.get(userId);
    const changedSlices = getChangedPersistedSlices(previousSignatures, nextSignatures);

    if (!changedSlices.length) {
      return;
    }

    await savePersistedSlicesToSupabase(userId, snapshot, changedSlices);
    persistedSliceSignaturesByUser.set(userId, nextSignatures);
  });

  return persistWriteQueue;
}

export async function loadPersistedSlicesFromSupabase(
  userId: string,
  requestedSlices: PersistedSliceKey[],
): Promise<Partial<PersistedState>> {
  const slices = [...new Set(requestedSlices)];
  if (!slices.length) return {};

  const needsAppState = slices.includes("appState");
  const needsFavorites = slices.includes("favorites");
  const needsMemos = slices.includes("memos");
  const needsPlans = slices.includes("plans");
  const needsPrayers = slices.includes("prayers");
  const needsGrassData = slices.includes("grassData");

  const supabase = createBrowserSupabaseClient();
  const patch = createInitialSlicePatch(slices);

  const [
    stateRowsResult,
    favoritesResult,
    memosResult,
    memoVersesResult,
    plansResult,
    prayersResult,
    grassResult,
  ] = await Promise.all([
    needsAppState ? supabase.from(USER_BIBLE_STATE_TABLE).select("key, value").eq("user_id", userId) : Promise.resolve(null),
    needsFavorites
      ? supabase.from(USER_FAVORITES_TABLE).select("book_code, chapter, verse, verse_text, created_at").eq("user_id", userId)
      : Promise.resolve(null),
    needsMemos
      ? supabase
          .from(USER_MEMOS_TABLE)
          .select("id, client_id, title, content, verse_text, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
      : Promise.resolve(null),
    needsMemos
      ? supabase.from(USER_MEMO_VERSES_TABLE).select("memo_id, book_code, chapter, verse").eq("user_id", userId)
      : Promise.resolve(null),
    needsPlans
      ? supabase
          .from(USER_PLANS_TABLE)
          .select(
            "id, client_id, plan_name, start_date, end_date, total_read_count, current_read_count, goal_percent, read_count_per_day, rest_day, goal_status, selected_book_codes, created_at, updated_at",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
      : Promise.resolve(null),
    needsPrayers
      ? supabase
          .from(USER_PRAYERS_TABLE)
          .select("id, client_id, requester, target, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
      : Promise.resolve(null),
    needsGrassData ? supabase.from(USER_GRASS_TABLE).select("date, data").eq("user_id", userId) : Promise.resolve(null),
  ]);

  for (const result of [
    stateRowsResult,
    favoritesResult,
    memosResult,
    memoVersesResult,
    plansResult,
    prayersResult,
    grassResult,
  ]) {
    if (result?.error) throwSupabaseError(result.error);
  }

  if (needsAppState) {
    const initial = createInitialPersistedState();
    const stateRows = ((stateRowsResult?.data ?? []) as StateRow[]).filter((row) => typeof row.key === "string");
    const stateMap = new Map(stateRows.map((row) => [row.key, row.value]));

    patch.theme = fromRemoteTheme(stateMap.get("appTheme"));
    patch.appLanguage = isAppLanguage(stateMap.get("appLanguage"))
      ? (stateMap.get("appLanguage") as PersistedState["appLanguage"])
      : initial.appLanguage;
    patch.bible = normalizeBibleState(stateMap.get("bibleSearchInfo"), initial.bible);
    if (isGrassTheme(stateMap.get("grassColorTheme"))) {
      patch.grassTheme = stateMap.get("grassColorTheme") as GrassColorTheme;
    }
    if (typeof stateMap.get("stepRewardUsedDate") === "string") {
      patch.stepRewardUsedDate = stateMap.get("stepRewardUsedDate") as string;
    }
  }

  if (needsFavorites) {
    const favoritesRows = (favoritesResult?.data ?? []) as FavoriteRow[];
    patch.favorites = favoritesRows.map((row) => ({
      bookCode: row.book_code,
      chapter: Math.max(1, Math.floor(toNumber(row.chapter, 1))),
      verse: Math.max(1, Math.floor(toNumber(row.verse, 1))),
      verseText: row.verse_text ?? "",
      createdAt: row.created_at ?? "",
    }));
  }

  if (needsMemos) {
    const memoRows = (memosResult?.data ?? []) as MemoRow[];
    const memoVerseRows = (memoVersesResult?.data ?? []) as MemoVerseRow[];
    const memoVerseMap = new Map<number, MemoVerseRow[]>();

    for (const row of memoVerseRows) {
      const existing = memoVerseMap.get(row.memo_id);
      if (existing) existing.push(row);
      else memoVerseMap.set(row.memo_id, [row]);
    }

    patch.memos = memoRows.map((row) => {
      const memo: MemoRecord = {
        id: row.client_id?.trim() || String(row.id),
        title: row.title ?? "",
        content: row.content ?? "",
        verseText: row.verse_text ?? "",
        createdAt: row.created_at ?? "",
      };

      const verses = [...(memoVerseMap.get(row.id) ?? [])].sort((left, right) => left.verse - right.verse);
      if (!verses.length) return memo;

      const first = verses[0];
      const sameLocation = verses.every(
        (item) => item.book_code === first.book_code && item.chapter === first.chapter,
      );

      if (!sameLocation) return memo;

      return {
        ...memo,
        bookCode: first.book_code,
        chapter: first.chapter,
        verseNumbers: verses.map((item) => item.verse),
      };
    });
  }

  if (needsPlans) {
    const planRows = (plansResult?.data ?? []) as PlanRow[];
    patch.plans = planRows.map((row) => createPlanRecordFromRow(row));
  }

  if (needsPrayers) {
    const prayerRows = (prayersResult?.data ?? []) as PrayerRow[];
    const prayerIds = [...new Set(prayerRows.map((row) => row.id).filter((value) => Number.isFinite(value)))];
    let prayerContentRows: PrayerContentRow[] = [];

    if (prayerIds.length > 0) {
      const { data, error } = await supabase
        .from(USER_PRAYER_CONTENTS_TABLE)
        .select("id, client_id, prayer_id, content, registered_at")
        .in("prayer_id", prayerIds)
        .order("registered_at", { ascending: false })
        .order("id", { ascending: false });

      if (error) throwSupabaseError(error);
      prayerContentRows = (data ?? []) as PrayerContentRow[];
    }

    const prayerContentsMap = new Map<number, PrayerContent[]>();
    for (const row of prayerContentRows) {
      const content: PrayerContent = {
        id: row.client_id?.trim() || String(row.id),
        content: row.content ?? "",
        registeredAt: row.registered_at ?? "",
      };
      const existing = prayerContentsMap.get(row.prayer_id);
      if (existing) existing.push(content);
      else prayerContentsMap.set(row.prayer_id, [content]);
    }

    patch.prayers = prayerRows.map((row) => ({
      id: row.client_id?.trim() || String(row.id),
      requester: row.requester ?? "",
      target: row.target ?? "",
      createdAt: row.created_at ?? "",
      contents: [...(prayerContentsMap.get(row.id) ?? [])].sort((left, right) =>
        right.registeredAt.localeCompare(left.registeredAt),
      ),
    }));
  }

  if (needsGrassData) {
    const grassRows = (grassResult?.data ?? []) as GrassRow[];
    const metaRow = grassRows.find((row) => row.date === GRASS_META_ROW_DATE);
    const meta = metaRow && typeof metaRow.data === "object" && metaRow.data !== null
      ? (metaRow.data as { grassTheme?: unknown; stepRewardUsedDate?: unknown })
      : null;

    patch.grassData = Object.fromEntries(
      grassRows
        .filter((row) => row.date !== GRASS_META_ROW_DATE)
        .map((row) => [row.date, normalizeGrassDayValue(row.date, row.data)]),
    );
    if (isGrassTheme(meta?.grassTheme)) {
      patch.grassTheme = meta.grassTheme as GrassColorTheme;
    }
    if (typeof meta?.stepRewardUsedDate === "string") {
      patch.stepRewardUsedDate = meta.stepRewardUsedDate;
    }
  }

  const cacheState = Object.assign(createInitialPersistedState(), patch);
  cachePersistedSliceSignatures(userId, cacheState, slices);

  return patch;
}

export async function loadPersistedStateFromSupabase(userId: string): Promise<Partial<PersistedState>> {
  return loadPersistedSlicesFromSupabase(userId, ["appState"]);
}

export async function clearLocalPersistedState(): Promise<void> {
  await removeLocalPersistedItem(APP_STORE_PERSIST_KEY);
}

export async function bootstrapSupabaseUserData(userId: string, localState: PersistedState): Promise<void> {
  const remoteHasData = await hasRemoteRows(userId);

  if (!remoteHasData) {
    await savePersistedStateToSupabase(userId, localState);
  }

  await clearLocalPersistedState();
}
