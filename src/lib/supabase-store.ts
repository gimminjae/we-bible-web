"use client";

import type { BibleLang, BibleSearchInfo, FavoriteVerseRecord } from "@/components/bible/types";
import type { GrassColorTheme, GrassDataMap, GrassDayEntry } from "@/lib/grass";
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

let persistWriteQueue: Promise<void> = Promise.resolve();

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
    {
      key: "grassColorTheme",
      value: state.grassTheme,
    },
  ];
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

  if (state.stepRewardUsedDate) {
    const { error } = await supabase.from(USER_BIBLE_STATE_TABLE).upsert(
      {
        user_id: userId,
        key: "stepRewardUsedDate",
        value: state.stepRewardUsedDate,
      },
      {
        onConflict: "user_id,key",
      },
    );
    if (error) throwSupabaseError(error);
    return;
  }

  const { error } = await supabase
    .from(USER_BIBLE_STATE_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("key", "stepRewardUsedDate");

  if (error) throwSupabaseError(error);
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

async function replaceGrass(userId: string, grassData: GrassDataMap): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error: deleteError } = await supabase.from(USER_GRASS_TABLE).delete().eq("user_id", userId);
  if (deleteError) throwSupabaseError(deleteError);

  const payload = Object.values(grassData).map((day) => ({
    user_id: userId,
    date: day.date,
    data: {
      date: day.date,
      data: day.data,
      fillYn: day.fillYn,
    },
  }));

  if (!payload.length) return;

  const { error } = await supabase.from(USER_GRASS_TABLE).insert(payload);
  if (error) throwSupabaseError(error);
}

export async function savePersistedStateToSupabase(userId: string, state: PersistedState): Promise<void> {
  const snapshot = pickPersistedState(state);

  await replaceStateRows(userId, snapshot);
  await replaceFavorites(userId, snapshot.favorites);
  await replaceMemos(userId, snapshot.memos);
  await replacePlans(userId, snapshot.plans);
  await replacePrayers(userId, snapshot.prayers);
  await replaceGrass(userId, snapshot.grassData);
}

export function queuePersistedStateSave(userId: string, state: PersistedState): Promise<void> {
  const snapshot = pickPersistedState(state);
  persistWriteQueue = persistWriteQueue.catch(() => undefined).then(() => savePersistedStateToSupabase(userId, snapshot));
  return persistWriteQueue;
}

export async function loadPersistedStateFromSupabase(userId: string): Promise<PersistedState | null> {
  const supabase = createBrowserSupabaseClient();
  const [
    stateRowsResult,
    favoritesResult,
    memosResult,
    memoVersesResult,
    plansResult,
    prayersResult,
    grassResult,
  ] = await Promise.all([
    supabase.from(USER_BIBLE_STATE_TABLE).select("key, value").eq("user_id", userId),
    supabase.from(USER_FAVORITES_TABLE).select("book_code, chapter, verse, verse_text, created_at").eq("user_id", userId),
    supabase
      .from(USER_MEMOS_TABLE)
      .select("id, client_id, title, content, verse_text, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase.from(USER_MEMO_VERSES_TABLE).select("memo_id, book_code, chapter, verse").eq("user_id", userId),
    supabase
      .from(USER_PLANS_TABLE)
      .select(
        "id, client_id, plan_name, start_date, end_date, total_read_count, current_read_count, goal_percent, read_count_per_day, rest_day, goal_status, selected_book_codes, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase.from(USER_PRAYERS_TABLE).select("id, client_id, requester, target, created_at").eq("user_id", userId).order("created_at", { ascending: false }).order("id", { ascending: false }),
    supabase.from(USER_GRASS_TABLE).select("date, data").eq("user_id", userId),
  ]);

  const results = [
    stateRowsResult,
    favoritesResult,
    memosResult,
    memoVersesResult,
    plansResult,
    prayersResult,
    grassResult,
  ];
  for (const result of results) {
    if (result.error) throwSupabaseError(result.error);
  }

  const stateRows = (stateRowsResult.data ?? []) as StateRow[];
  const favoritesRows = (favoritesResult.data ?? []) as FavoriteRow[];
  const memoRows = (memosResult.data ?? []) as MemoRow[];
  const memoVerseRows = (memoVersesResult.data ?? []) as MemoVerseRow[];
  const planRows = (plansResult.data ?? []) as PlanRow[];
  const prayerRows = (prayersResult.data ?? []) as PrayerRow[];
  const grassRows = (grassResult.data ?? []) as GrassRow[];
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

  const hasRemoteData =
    stateRows.length > 0 ||
    favoritesRows.length > 0 ||
    memoRows.length > 0 ||
    planRows.length > 0 ||
    prayerRows.length > 0 ||
    grassRows.length > 0;

  if (!hasRemoteData) return null;

  const state = createInitialPersistedState();
  const stateMap = new Map(stateRows.map((row) => [row.key, row.value]));

  state.theme = fromRemoteTheme(stateMap.get("appTheme"));
  if (isAppLanguage(stateMap.get("appLanguage"))) {
    state.appLanguage = stateMap.get("appLanguage") as PersistedState["appLanguage"];
  }
  state.bible = normalizeBibleState(stateMap.get("bibleSearchInfo"), state.bible);
  if (isGrassTheme(stateMap.get("grassColorTheme"))) {
    state.grassTheme = stateMap.get("grassColorTheme") as GrassColorTheme;
  }
  state.stepRewardUsedDate = typeof stateMap.get("stepRewardUsedDate") === "string" ? (stateMap.get("stepRewardUsedDate") as string) : null;

  state.favorites = favoritesRows.map((row) => ({
    bookCode: row.book_code,
    chapter: Math.max(1, Math.floor(toNumber(row.chapter, 1))),
    verse: Math.max(1, Math.floor(toNumber(row.verse, 1))),
    verseText: row.verse_text ?? "",
    createdAt: row.created_at ?? "",
  }));

  const memoVerseMap = new Map<number, MemoVerseRow[]>();
  for (const row of memoVerseRows) {
    const existing = memoVerseMap.get(row.memo_id);
    if (existing) existing.push(row);
    else memoVerseMap.set(row.memo_id, [row]);
  }

  state.memos = memoRows.map((row) => {
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

  state.plans = planRows.map((row) => createPlanRecordFromRow(row));

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

  state.prayers = prayerRows.map((row) => ({
    id: row.client_id?.trim() || String(row.id),
    requester: row.requester ?? "",
    target: row.target ?? "",
    createdAt: row.created_at ?? "",
    contents: [...(prayerContentsMap.get(row.id) ?? [])].sort((left, right) =>
      right.registeredAt.localeCompare(left.registeredAt),
    ),
  }));

  state.grassData = Object.fromEntries(
    grassRows.map((row) => [row.date, normalizeGrassDayValue(row.date, row.data)]),
  );

  return state;
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
