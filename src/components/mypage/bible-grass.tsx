"use client";

import { useMemo, useState } from "react";

import { ChevronDown, CircleHelp } from "@/components/icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { getChapterCountForDate, getStreakUpToYesterday, type GrassColorTheme } from "@/lib/grass";
import { formatShortDate } from "@/lib/date";
import { getBookName } from "@/services/bible";
import { useAppSettings } from "@/contexts/app-settings";
import { useBibleGrass } from "@/hooks/use-bible-grass";
import { useDrawer } from "@/hooks/use-drawer";
import { useToast } from "@/hooks/use-toast";
import { isFreeRewardAvailable } from "@/store/app-store";
import { useI18n } from "@/utils/i18n";

const DAY_LABELS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;
type MonthKey = (typeof MONTH_KEYS)[number];

const CELL_SIZE_REM = 0.875;
const CELL_GAP_REM = 0.1875;
const MONTH_GAP_REM = 0.3125;
const DAY_LABEL_WIDTH_REM = 1.5;

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

function getMonthLabels(year: number): Array<{ col: number; label: MonthKey }> {
  const sundayStart = getSundayBefore(new Date(year, 0, 1));
  const labels: Array<{ col: number; label: MonthKey }> = [];

  MONTH_KEYS.forEach((monthKey, monthIndex) => {
    const firstDay = new Date(year, monthIndex, 1);
    const diffDays = Math.round((firstDay.getTime() - sundayStart.getTime()) / 86_400_000);
    const col = Math.floor(diffDays / 7);
    if (col >= 0 && col < 53) {
      labels.push({ col, label: monthKey });
    }
  });

  return labels;
}

function isFirstOfMonth(dateStr: string): boolean {
  return dateStr.endsWith("-01");
}

function getColumnLeft(colIdx: number, grid: CellInfo[][], cellSizeRem: number, cellGapRem: number, monthGapRem: number): number {
  let left = colIdx * (cellSizeRem + cellGapRem);
  for (let column = 0; column < colIdx; column += 1) {
    const hasMonthStart = grid.some((row) => isFirstOfMonth(row[column]?.dateStr ?? ""));
    if (hasMonthStart) {
      left += monthGapRem;
    }
  }
  return left;
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
  const {
    grassData,
    grassTheme,
    setGrassTheme,
    fillPastGrass,
    stepRewardUsedDate,
    markStepRewardUsed,
    isLoading,
    error,
  } = useBibleGrass();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const guideDrawer = useDrawer();
  const yearPickerDrawer = useDrawer();

  const themeClasses = GRASS_THEME_CLASSES[grassTheme];
  const grid = useMemo(() => buildGrid(selectedYear), [selectedYear]);
  const monthLabels = useMemo(() => getMonthLabels(selectedYear), [selectedYear]);
  const gridTrackWidthRem = useMemo(
    () => getColumnLeft(52, grid, CELL_SIZE_REM, CELL_GAP_REM, MONTH_GAP_REM) + CELL_SIZE_REM,
    [grid],
  );
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

  if (error) {
    return (
      <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 text-sm text-error shadow-sm">
        {error}
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 text-sm text-base-content/55 shadow-sm">
        Loading grass data...
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-1 items-start gap-2 pr-2">
          <p className="pt-0.5 text-sm leading-6 text-base-content/70">
            {includesYesterday
              ? streak <= 6
                ? t("grass.streakStart")
                : streak <= 30
                  ? t("grass.streakMonth")
                  : t("grass.streakMonthPlus")
              : totalChapters > 0
                ? t("grass.streakStart")
                : t("grass.streakNone")}
          </p>
          <button type="button" className="btn btn-ghost btn-sm btn-circle mt-0.5 shrink-0" onClick={guideDrawer.open}>
            <CircleHelp className="size-4" />
          </button>
        </div>

        <button type="button" className="btn btn-sm btn-ghost min-w-20 justify-between gap-2 border border-base-300 px-4" onClick={yearPickerDrawer.open}>
          {selectedYear}
          <ChevronDown className="size-4 opacity-60" />
        </button>
      </div>

      <div className="overflow-x-auto pb-2">
        <div style={{ minWidth: `${DAY_LABEL_WIDTH_REM + CELL_GAP_REM + gridTrackWidthRem}rem` }}>
          <div
            className="relative mb-1"
            style={{
              marginLeft: `${DAY_LABEL_WIDTH_REM + CELL_GAP_REM}rem`,
              height: "1rem",
              width: `${gridTrackWidthRem}rem`,
            }}
          >
            {monthLabels.map(({ col, label }) => (
              <div
                key={`${col}-${label}`}
                className="absolute whitespace-nowrap text-[10px] text-base-content/50"
                style={{
                  left: `${getColumnLeft(col, grid, CELL_SIZE_REM, CELL_GAP_REM, MONTH_GAP_REM)}rem`,
                }}
              >
                {t(`grass.month.${label}`)}
              </div>
            ))}
          </div>

          <div className="flex" style={{ gap: `${CELL_GAP_REM}rem` }}>
            <div style={{ width: `${DAY_LABEL_WIDTH_REM}rem` }}>
              {DAY_LABELS.map((dayKey) => (
                <div
                  key={dayKey}
                  className="text-[10px] text-base-content/50"
                  style={{
                    height: `${CELL_SIZE_REM + CELL_GAP_REM}rem`,
                    lineHeight: `${CELL_SIZE_REM + CELL_GAP_REM}rem`,
                  }}
                >
                  {t(`grass.day.${dayKey}`)}
                </div>
              ))}
            </div>

            <div className="flex" style={{ gap: `${CELL_GAP_REM}rem` }}>
              {grid[0]?.map((_, columnIndex) => {
                const hasMonthStart = grid.some((row) => isFirstOfMonth(row[columnIndex]?.dateStr ?? ""));

                return (
                  <div key={columnIndex} style={{ marginLeft: hasMonthStart ? `${MONTH_GAP_REM}rem` : 0 }}>
                    <div className="flex flex-col" style={{ gap: `${CELL_GAP_REM}rem` }}>
                      {grid.map((row, rowIndex) => {
                        const cell = row[columnIndex];
                        if (!cell?.dateStr) {
                          return (
                            <div
                              key={rowIndex}
                              className="rounded-[0.35rem] bg-transparent"
                              style={{ width: `${CELL_SIZE_REM}rem`, height: `${CELL_SIZE_REM}rem` }}
                            />
                          );
                        }

                        const count = getChapterCountForDate(grassData, cell.dateStr);
                        const filledByPoint = grassData[cell.dateStr]?.fillYn === true;
                        const level = count <= 0 ? (filledByPoint ? 1 : 0) : count >= 10 ? 4 : count >= 5 ? 3 : count >= 3 ? 2 : 1;

                        return (
                          <button
                            key={rowIndex}
                            type="button"
                            aria-label={formatShortDate(cell.dateStr)}
                            aria-pressed={selectedDate === cell.dateStr}
                            title={formatShortDate(cell.dateStr)}
                            className={`block appearance-none rounded-[0.35rem] border-0 p-0 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-base-content/40 focus-visible:ring-offset-1 focus-visible:ring-offset-base-100 ${
                              selectedDate === cell.dateStr ? "ring-1 ring-base-content/40 ring-offset-1 ring-offset-base-100" : ""
                            } ${themeClasses[level as 0 | 1 | 2 | 3 | 4]}`}
                            style={{ width: `${CELL_SIZE_REM}rem`, height: `${CELL_SIZE_REM}rem` }}
                            onClick={() => setSelectedDate(cell.dateStr)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-base-content/60">
          <span>{t("grass.less")}</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div key={level} className={`h-3.5 w-3.5 rounded-[0.35rem] ${themeClasses[level as 0 | 1 | 2 | 3 | 4]}`} />
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
            <p>{selectedDate}</p>
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

      <BottomSheet open={guideDrawer.isOpen} onClose={guideDrawer.close} title={t("grass.guide.title")}>
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
                <div className={`h-4 w-4 rounded-[0.35rem] ${themeClasses[level as 0 | 1 | 2 | 3 | 4]}`} />
                <span>{t(`grass.guide.color${level}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={yearPickerDrawer.isOpen} onClose={yearPickerDrawer.close} title={t("grass.selectYear")}>
        <div className="space-y-2 pb-4">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              className={`btn w-full justify-start ${year === selectedYear ? "btn-primary" : "btn-ghost border border-base-300"}`}
              onClick={() => {
                setSelectedYear(year);
                setSelectedDate(null);
                yearPickerDrawer.close();
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
