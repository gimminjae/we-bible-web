"use client";

import { CircleHelp } from "lucide-react";
import { useMemo, useState } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { getChapterCountForDate, getStreakUpToYesterday, type GrassColorTheme } from "@/lib/grass";
import { formatShortDate } from "@/lib/date";
import { getBookName } from "@/services/bible";
import { useAppSettings } from "@/contexts/app-settings";
import { useToast } from "@/hooks/use-toast";
import { isFreeRewardAvailable, useAppStore } from "@/store/app-store";
import { useI18n } from "@/utils/i18n";

const DAY_LABELS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

const GRASS_THEME_CLASSES: Record<GrassColorTheme, Record<0 | 1 | 2 | 3 | 4, string>> = {
  green: { 0: "bg-base-300", 1: "bg-emerald-700", 2: "bg-emerald-600", 3: "bg-emerald-500", 4: "bg-emerald-400" },
  yellow: { 0: "bg-base-300", 1: "bg-amber-700", 2: "bg-amber-600", 3: "bg-amber-500", 4: "bg-amber-400" },
  orange: { 0: "bg-base-300", 1: "bg-orange-700", 2: "bg-orange-600", 3: "bg-orange-500", 4: "bg-orange-400" },
  red: { 0: "bg-base-300", 1: "bg-rose-700", 2: "bg-rose-600", 3: "bg-rose-500", 4: "bg-rose-400" },
  blue: { 0: "bg-base-300", 1: "bg-blue-700", 2: "bg-blue-600", 3: "bg-blue-500", 4: "bg-blue-400" },
  purple: { 0: "bg-base-300", 1: "bg-violet-700", 2: "bg-violet-600", 3: "bg-violet-500", 4: "bg-violet-400" },
  sky: { 0: "bg-base-300", 1: "bg-sky-700", 2: "bg-sky-600", 3: "bg-sky-500", 4: "bg-sky-400" },
};

type CellInfo = {
  dateStr: string;
};

function toDateString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSundayBefore(value: Date): Date {
  const copy = new Date(value);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function buildGrid(year: number): CellInfo[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const sundayStart = getSundayBefore(yearStart);
  const columns = 53;

  return Array.from({ length: 7 }, (_, rowIndex) =>
    Array.from({ length: columns }, (_, columnIndex) => {
      const cellDate = new Date(sundayStart);
      cellDate.setDate(sundayStart.getDate() + columnIndex * 7 + rowIndex);
      if (cellDate > (year === today.getFullYear() ? today : yearEnd)) return { dateStr: "" };
      if (cellDate < yearStart || cellDate > yearEnd) return { dateStr: "" };
      return { dateStr: toDateString(cellDate) };
    }),
  );
}

function formatChapterRanges(chapters: number[]): string {
  if (!chapters.length) return "";
  const sorted = [...chapters].sort((left, right) => left - right);
  const parts: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] === end + 1) {
      end = sorted[index];
      continue;
    }
    parts.push(start === end ? String(start) : `${start} ~ ${end}`);
    start = sorted[index];
    end = sorted[index];
  }

  parts.push(start === end ? String(start) : `${start} ~ ${end}`);
  return parts.join(", ");
}

function pickRandomNextTheme(current: GrassColorTheme): GrassColorTheme {
  const keys = Object.keys(GRASS_THEME_CLASSES) as GrassColorTheme[];
  const options = keys.filter((value) => value !== current);
  return options[Math.floor(Math.random() * options.length)] ?? current;
}

export function BibleGrass() {
  const { appLanguage } = useAppSettings();
  const { t } = useI18n();
  const { showToast } = useToast();
  const grassData = useAppStore((state) => state.grassData);
  const grassTheme = useAppStore((state) => state.grassTheme);
  const setGrassTheme = useAppStore((state) => state.setGrassTheme);
  const fillPastGrass = useAppStore((state) => state.fillPastGrass);
  const stepRewardUsedDate = useAppStore((state) => state.stepRewardUsedDate);
  const markStepRewardUsed = useAppStore((state) => state.markStepRewardUsed);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  const themeClasses = GRASS_THEME_CLASSES[grassTheme];
  const grid = useMemo(() => buildGrid(selectedYear), [selectedYear]);
  const totalChapters = useMemo(
    () =>
      grid.flat().reduce((sum, cell) => {
        if (!cell.dateStr) return sum;
        return sum + getChapterCountForDate(grassData, cell.dateStr);
      }, 0),
    [grassData, grid],
  );
  const { streak, includesYesterday } = useMemo(
    () => getStreakUpToYesterday(grassData, selectedYear),
    [grassData, selectedYear],
  );

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2, current - 3, current - 4];
  }, []);

  const recentDates = useMemo(
    () =>
      Object.keys(grassData)
        .filter((date) => (grassData[date]?.data.length ?? 0) > 0 || grassData[date]?.fillYn)
        .sort((left, right) => right.localeCompare(left))
        .slice(0, 3),
    [grassData],
  );

  const canFillSelectedDate = selectedDate
    ? selectedDate < toDateString(new Date()) &&
      (grassData[selectedDate]?.data.length ?? 0) === 0 &&
      !grassData[selectedDate]?.fillYn
    : false;

  const formatReadingSummary = (date: string) =>
    grassData[date]?.data
      .map((entry) => `${getBookName(entry.bookCode, appLanguage)} ${formatChapterRanges(entry.readChapter)}`)
      .join(", ") ?? "";

  const handleChangeColor = () => {
    setGrassTheme(pickRandomNextTheme(grassTheme));
    markStepRewardUsed(toDateString(new Date()));
    showToast(t("grass.colorChanged"));
  };

  const handleFillPastGrass = () => {
    if (!selectedDate) return;
    const filled = fillPastGrass(selectedDate);
    if (filled) {
      markStepRewardUsed(toDateString(new Date()));
      showToast(t("grass.fillSuccess"));
    }
  };

  const freeReward = isFreeRewardAvailable(stepRewardUsedDate);

  return (
    <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-base-content/45">Bible Grass</p>
          <h2 className="text-lg font-semibold">
            {includesYesterday
              ? streak <= 6
                ? t("grass.streakStart")
                : streak <= 30
                  ? t("grass.streakMonth")
                  : t("grass.streakMonthPlus")
              : totalChapters > 0
                ? t("grass.streakStart")
                : t("grass.streakNone")}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={() => setGuideOpen(true)}>
            <CircleHelp className="size-4" />
          </button>
          <button type="button" className="btn btn-sm btn-ghost border border-base-300" onClick={() => setYearPickerOpen(true)}>
            {selectedYear}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[42rem]">
          <div className="mb-1 grid grid-cols-[2rem_repeat(53,minmax(0,1fr))] gap-1 text-[10px] text-base-content/50">
            <div />
            {Array.from({ length: 53 }, (_, columnIndex) => {
              const label = MONTH_KEYS.find((monthKey, monthIndex) => {
                const firstDay = new Date(selectedYear, monthIndex, 1);
                const sundayStart = getSundayBefore(new Date(selectedYear, 0, 1));
                const diffDays = Math.round((firstDay.getTime() - sundayStart.getTime()) / 86_400_000);
                return Math.floor(diffDays / 7) === columnIndex;
              });
              return <div key={columnIndex}>{label ? t(`grass.month.${label}`) : ""}</div>;
            })}
          </div>

          <div className="grid grid-cols-[2rem_repeat(53,minmax(0,1fr))] gap-1">
            {DAY_LABELS.map((dayKey, rowIndex) => (
              <div key={dayKey} className="contents">
                <div className="text-[10px] leading-5 text-base-content/50">{t(`grass.day.${dayKey}`)}</div>
                {grid[rowIndex].map((cell, columnIndex) => {
                  if (!cell.dateStr) {
                    return <div key={`${dayKey}-${columnIndex}`} className="aspect-square rounded bg-transparent" />;
                  }
                  const count = getChapterCountForDate(grassData, cell.dateStr);
                  const filledByPoint = grassData[cell.dateStr]?.fillYn === true;
                  const level = count <= 0 ? (filledByPoint ? 1 : 0) : count >= 10 ? 4 : count >= 5 ? 3 : count >= 3 ? 2 : 1;
                  return (
                    <button
                      key={`${dayKey}-${columnIndex}`}
                      type="button"
                      className={`aspect-square rounded-sm text-[9px] font-semibold text-white ${themeClasses[level as 0 | 1 | 2 | 3 | 4]}`}
                      onClick={() => setSelectedDate(cell.dateStr)}
                    >
                      {cell.dateStr.slice(-2).replace(/^0/, "")}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-base-content/60">
          <span>{t("grass.less")}</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div key={level} className={`h-3 w-3 rounded-sm ${themeClasses[level as 0 | 1 | 2 | 3 | 4]}`} />
            ))}
          </div>
          <span>{t("grass.more")}</span>
        </div>

        <button type="button" className="btn btn-sm btn-ghost border border-base-300" onClick={handleChangeColor}>
          {freeReward ? t("grass.changeColorButtonFree") : t("grass.changeColorButton")}
        </button>
      </div>

      <div className="mt-4 border-t border-base-300 pt-4 text-sm leading-6 text-base-content/70">
        {selectedDate ? (
          <div className="space-y-3">
            <p>
              {(grassData[selectedDate]?.data.length ?? 0) > 0
                ? selectedDate === toDateString(new Date())
                  ? t("grass.todayReadFormat").replace("{books}", formatReadingSummary(selectedDate))
                  : t("grass.dateReadFormat")
                      .replace("{date}", formatShortDate(selectedDate))
                      .replace("{books}", formatReadingSummary(selectedDate))
                : grassData[selectedDate]?.fillYn
                  ? t("grass.filledByPointHistory")
                  : t("grass.noReadingOnDate")}
            </p>

            {canFillSelectedDate ? (
              <button type="button" className="btn btn-success btn-sm" onClick={handleFillPastGrass}>
                {freeReward ? t("grass.fillButtonFree") : t("grass.fillButton")}
              </button>
            ) : null}
          </div>
        ) : recentDates.length ? (
          <div className="space-y-2">
            {recentDates.map((date) => (
              <p key={date}>
                {(grassData[date]?.data.length ?? 0) > 0
                  ? date === toDateString(new Date())
                    ? t("grass.todayReadFormat").replace("{books}", formatReadingSummary(date))
                    : t("grass.dateReadFormat").replace("{date}", formatShortDate(date)).replace("{books}", formatReadingSummary(date))
                  : t("grass.filledByPointHistory")}
              </p>
            ))}
          </div>
        ) : (
          <p>{t("grass.noDataYet")}</p>
        )}
      </div>

      <BottomSheet open={guideOpen} onClose={() => setGuideOpen(false)} title={t("grass.guide.title")}>
        <div className="space-y-5 pb-4 text-sm leading-6 text-base-content/70">
          <div>
            <h3 className="font-semibold text-base-content">{t("grass.guide.overviewTitle")}</h3>
            <p>{t("grass.guide.overviewBody")}</p>
          </div>
          <div>
            <h3 className="font-semibold text-base-content">{t("grass.guide.sourceTitle")}</h3>
            <p>{t("grass.guide.sourceBody")}</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-base-content">{t("grass.guide.colorTitle")}</h3>
            {[0, 1, 2, 3, 4].map((level) => (
              <div key={level} className="flex items-center gap-3">
                <div className={`h-4 w-4 rounded-sm ${themeClasses[level as 0 | 1 | 2 | 3 | 4]}`} />
                <span>{t(`grass.guide.color${level}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={yearPickerOpen} onClose={() => setYearPickerOpen(false)} title={t("grass.selectYear")}>
        <div className="space-y-2 pb-4">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              className={`btn w-full justify-start ${year === selectedYear ? "btn-primary" : "btn-ghost border border-base-300"}`}
              onClick={() => {
                setSelectedYear(year);
                setSelectedDate(null);
                setYearPickerOpen(false);
              }}
            >
              {year}
            </button>
          ))}
        </div>
      </BottomSheet>
    </section>
  );
}
