"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { BibleLang, FavoriteVerseRecord } from "@/components/bible/types";
import { createId, formatDateTime, todayString } from "@/lib/date";
import { type GrassColorTheme, type GrassDataMap, fillGrassByPoint, syncGrassFromPlanSave } from "@/lib/grass";
import { type GoalStatus, type PlanRecord, createInitialPlan, updatePlanComputedFields } from "@/lib/plan";
import { createSafeJsonStorage } from "@/lib/storage";

export type AppTheme = "light" | "night";
export type AppLanguage = "ko" | "en";

export type MemoRecord = {
  id: string;
  title: string;
  content: string;
  verseText: string;
  createdAt: string;
  bookCode?: string;
  chapter?: number;
  verseNumbers?: number[];
};

export type PrayerContent = {
  id: string;
  content: string;
  registeredAt: string;
};

export type PrayerRecord = {
  id: string;
  requester: string;
  target: string;
  createdAt: string;
  contents: PrayerContent[];
};

export type PersistedState = {
  theme: AppTheme;
  appLanguage: AppLanguage;
  bible: {
    bookCode: string;
    chapter: number;
    primaryLang: BibleLang;
    secondaryLang: BibleLang;
    dualLang: boolean;
    fontScale: number;
  };
  favorites: FavoriteVerseRecord[];
  memos: MemoRecord[];
  prayers: PrayerRecord[];
  plans: PlanRecord[];
  grassData: GrassDataMap;
  grassTheme: GrassColorTheme;
  stepRewardUsedDate: string | null;
};

type AppStore = PersistedState & {
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setTheme: (theme: AppTheme) => void;
  setAppLanguage: (language: AppLanguage) => void;
  setBibleState: (next: Partial<PersistedState["bible"]>) => void;
  goToBookChapter: (bookCode: string, chapter: number) => void;
  addFavorites: (
    bookCode: string,
    chapter: number,
    verses: Array<{ verse: number; text: string }>,
  ) => void;
  removeFavorites: (bookCode: string, chapter: number, verseNumbers: number[]) => void;
  addMemo: (input: {
    title: string;
    content: string;
    verseText: string;
    bookCode?: string;
    chapter?: number;
    verseNumbers?: number[];
  }) => string;
  updateMemo: (id: string, title: string, content: string) => void;
  deleteMemo: (id: string) => void;
  addPrayer: (input: { requester: string; target: string; content: string }) => string;
  updatePrayer: (id: string, requester: string, target: string) => void;
  deletePrayer: (id: string) => void;
  addPrayerContent: (id: string, content: string) => void;
  updatePrayerContent: (prayerId: string, contentId: string, content: string) => void;
  deletePrayerContent: (prayerId: string, contentId: string) => void;
  addPlan: (input: {
    planName: string;
    startDate: string;
    endDate: string;
    selectedBookCodes: string[];
  }) => string;
  updatePlanInfo: (
    id: string,
    input: { planName: string; startDate: string; endDate: string; selectedBookCodes: string[] },
  ) => void;
  updatePlanGoalStatus: (
    id: string,
    goalStatus: GoalStatus,
    options?: { bookCode?: string; previousStatus?: number[]; nextStatus?: number[] },
  ) => void;
  deletePlan: (id: string) => void;
  setGrassTheme: (theme: GrassColorTheme) => void;
  markStepRewardUsed: (dateKey: string) => void;
  fillPastGrass: (date: string) => boolean;
  replacePersistedState: (state: PersistedState) => void;
};

export const initialPersistedState: PersistedState = {
  theme: "light",
  appLanguage: "ko",
  bible: {
    bookCode: "genesis",
    chapter: 1,
    primaryLang: "ko",
    secondaryLang: "en",
    dualLang: false,
    fontScale: 1,
  },
  favorites: [],
  memos: [],
  prayers: [],
  plans: [],
  grassData: {},
  grassTheme: "green",
  stepRewardUsedDate: null,
};

const storage = createSafeJsonStorage<PersistedState>();

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialPersistedState,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setTheme: (theme) => set({ theme }),
      setAppLanguage: (appLanguage) => set({ appLanguage }),
      setBibleState: (next) =>
        set((state) => ({
          bible: { ...state.bible, ...next },
        })),
      goToBookChapter: (bookCode, chapter) =>
        set((state) => ({
          bible: {
            ...state.bible,
            bookCode,
            chapter,
          },
        })),
      addFavorites: (bookCode, chapter, verses) =>
        set((state) => {
          const createdAt = formatDateTime(new Date());
          const nextFavorites = [...state.favorites];

          for (const verse of verses) {
            const favorite: FavoriteVerseRecord = {
              bookCode,
              chapter,
              verse: verse.verse,
              verseText: verse.text,
              createdAt,
            };
            const existingIndex = nextFavorites.findIndex(
              (item) => item.bookCode === bookCode && item.chapter === chapter && item.verse === verse.verse,
            );
            if (existingIndex >= 0) nextFavorites.splice(existingIndex, 1, favorite);
            else nextFavorites.push(favorite);
          }

          nextFavorites.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
          return { favorites: nextFavorites };
        }),
      removeFavorites: (bookCode, chapter, verseNumbers) =>
        set((state) => ({
          favorites: state.favorites.filter(
            (favorite) =>
              !(favorite.bookCode === bookCode && favorite.chapter === chapter && verseNumbers.includes(favorite.verse)),
          ),
        })),
      addMemo: ({ title, content, verseText, bookCode, chapter, verseNumbers }) => {
        const id = createId();
        set((state) => ({
          memos: [
            {
              id,
              title,
              content,
              verseText,
              createdAt: formatDateTime(new Date()),
              ...(bookCode ? { bookCode } : {}),
              ...(typeof chapter === "number" ? { chapter } : {}),
              ...(verseNumbers?.length
                ? { verseNumbers: [...new Set(verseNumbers)].sort((left, right) => left - right) }
                : {}),
            },
            ...state.memos,
          ],
        }));
        return id;
      },
      updateMemo: (id, title, content) =>
        set((state) => ({
          memos: state.memos.map((memo) => (memo.id === id ? { ...memo, title, content } : memo)),
        })),
      deleteMemo: (id) =>
        set((state) => ({
          memos: state.memos.filter((memo) => memo.id !== id),
        })),
      addPrayer: ({ requester, target, content }) => {
        const id = createId();
        const registeredAt = formatDateTime(new Date());

        set((state) => ({
          prayers: [
            {
              id,
              requester: requester.trim(),
              target: target.trim(),
              createdAt: registeredAt,
              contents: content.trim()
                ? [
                    {
                      id: createId(),
                      content: content.trim(),
                      registeredAt,
                    },
                  ]
                : [],
            },
            ...state.prayers,
          ],
        }));

        return id;
      },
      updatePrayer: (id, requester, target) =>
        set((state) => ({
          prayers: state.prayers.map((prayer) =>
            prayer.id === id ? { ...prayer, requester: requester.trim(), target: target.trim() } : prayer,
          ),
        })),
      deletePrayer: (id) =>
        set((state) => ({
          prayers: state.prayers.filter((prayer) => prayer.id !== id),
        })),
      addPrayerContent: (id, content) =>
        set((state) => ({
          prayers: state.prayers.map((prayer) =>
            prayer.id === id
              ? {
                  ...prayer,
                  contents: [
                    {
                      id: createId(),
                      content: content.trim(),
                      registeredAt: formatDateTime(new Date()),
                    },
                    ...prayer.contents,
                  ],
                }
              : prayer,
          ),
        })),
      updatePrayerContent: (prayerId, contentId, content) =>
        set((state) => ({
          prayers: state.prayers.map((prayer) =>
            prayer.id === prayerId
              ? {
                  ...prayer,
                  contents: prayer.contents.map((item) =>
                    item.id === contentId ? { ...item, content: content.trim() } : item,
                  ),
                }
              : prayer,
          ),
        })),
      deletePrayerContent: (prayerId, contentId) =>
        set((state) => ({
          prayers: state.prayers.map((prayer) =>
            prayer.id === prayerId
              ? {
                  ...prayer,
                  contents: prayer.contents.filter((item) => item.id !== contentId),
                }
              : prayer,
          ),
        })),
      addPlan: ({ planName, startDate, endDate, selectedBookCodes }) => {
        const id = createId();
        const now = formatDateTime(new Date());
        set((state) => ({
          plans: [createInitialPlan(id, planName, startDate, endDate, selectedBookCodes, now), ...state.plans],
        }));
        return id;
      },
      updatePlanInfo: (id, input) =>
        set((state) => ({
          plans: state.plans.map((plan) => {
            if (plan.id !== id) return plan;
            return updatePlanComputedFields({
              ...plan,
              planName: input.planName,
              startDate: input.startDate,
              endDate: input.endDate,
              selectedBookCodes: input.selectedBookCodes,
              updatedAt: formatDateTime(new Date()),
            });
          }),
        })),
      updatePlanGoalStatus: (id, goalStatus, options) =>
        set((state) => {
          const nextPlans = state.plans.map((plan) =>
            plan.id === id
              ? updatePlanComputedFields({
                  ...plan,
                  goalStatus,
                  updatedAt: formatDateTime(new Date()),
                })
              : plan,
          );

          if (!options?.bookCode || !options.previousStatus || !options.nextStatus) {
            return { plans: nextPlans };
          }

          return {
            plans: nextPlans,
            grassData: syncGrassFromPlanSave(state.grassData, options.bookCode, options.previousStatus, options.nextStatus),
          };
        }),
      deletePlan: (id) =>
        set((state) => ({
          plans: state.plans.filter((plan) => plan.id !== id),
        })),
      setGrassTheme: (grassTheme) => set({ grassTheme }),
      markStepRewardUsed: (dateKey) => set({ stepRewardUsedDate: dateKey }),
      fillPastGrass: (date) => {
        let wasFilled = false;
        set((state) => {
          const result = fillGrassByPoint(state.grassData, date);
          wasFilled = result.filled;
          return { grassData: result.grassData };
        });
        return wasFilled;
      },
      replacePersistedState: (state) => set({ ...state }),
    }),
    {
      name: "we-bible-web-storage",
      storage,
      skipHydration: true,
      partialize: (state) => ({
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
      }),
    },
  ),
);

export function getFavoriteVerseNumbers(
  favorites: FavoriteVerseRecord[],
  bookCode: string,
  chapter: number,
): number[] {
  return favorites
    .filter((item) => item.bookCode === bookCode && item.chapter === chapter)
    .map((item) => item.verse)
    .sort((left, right) => left - right);
}

export function getMemoVerseNumbers(memos: MemoRecord[], bookCode: string, chapter: number): number[] {
  return [...new Set(
    memos
      .filter((memo) => memo.bookCode === bookCode && memo.chapter === chapter)
      .flatMap((memo) => memo.verseNumbers ?? []),
  )].sort((left, right) => left - right);
}

export function isFreeRewardAvailable(stepRewardUsedDate: string | null): boolean {
  return stepRewardUsedDate !== todayString();
}
