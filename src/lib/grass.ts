export type GrassColorTheme = "green" | "yellow" | "orange" | "red" | "blue" | "purple" | "sky";

export type GrassDayEntry = {
  bookCode: string;
  readChapter: number[];
};

export type GrassDayValue = {
  date: string;
  data: GrassDayEntry[];
  fillYn: boolean;
};

export type GrassDataMap = Record<string, GrassDayValue>;

export function getChapterCountForDate(data: GrassDataMap, date: string): number {
  const day = data[date];
  if (!day) return 0;
  return day.data.reduce((sum, entry) => sum + entry.readChapter.length, 0);
}

function toDateString(value: Date): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getStreakUpToYesterday(
  data: GrassDataMap,
  selectedYear: number,
): { streak: number; includesYesterday: boolean } {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = toDateString(yesterday);

  if (yesterday.getFullYear() !== selectedYear) {
    return { streak: 0, includesYesterday: false };
  }

  if (getChapterCountForDate(data, yesterdayString) === 0) {
    return { streak: 0, includesYesterday: false };
  }

  let streak = 1;
  const cursor = new Date(yesterday);
  cursor.setDate(cursor.getDate() - 1);

  while (cursor.getFullYear() === selectedYear && getChapterCountForDate(data, toDateString(cursor)) > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { streak, includesYesterday: true };
}

export function syncGrassFromPlanSave(
  grassData: GrassDataMap,
  bookCode: string,
  previousStatus: number[],
  nextStatus: number[],
): GrassDataMap {
  const prevChapters: number[] = [];
  const currentChapters: number[] = [];

  for (let index = 0; index < Math.max(previousStatus.length, nextStatus.length); index += 1) {
    if ((previousStatus[index] ?? 0) === 1) prevChapters.push(index + 1);
    if ((nextStatus[index] ?? 0) === 1) currentChapters.push(index + 1);
  }

  const today = toDateString(new Date());
  const existingDay = grassData[today] ?? { date: today, data: [], fillYn: false };
  const existingEntry = existingDay.data.find((entry) => entry.bookCode === bookCode);
  const untouchedChapters = (existingEntry?.readChapter ?? []).filter((chapter) => !prevChapters.includes(chapter));
  const mergedChapters = [...new Set([...untouchedChapters, ...currentChapters])].sort((left, right) => left - right);
  const nextEntries = existingDay.data.filter((entry) => entry.bookCode !== bookCode);

  if (mergedChapters.length > 0) {
    nextEntries.push({ bookCode, readChapter: mergedChapters });
  }

  return {
    ...grassData,
    [today]: {
      date: today,
      data: nextEntries,
      fillYn: nextEntries.length > 0 ? false : existingDay.fillYn,
    },
  };
}

export function fillGrassByPoint(grassData: GrassDataMap, date: string): { grassData: GrassDataMap; filled: boolean } {
  const existing = grassData[date];
  if ((existing?.data.length ?? 0) > 0) {
    return { grassData, filled: false };
  }

  return {
    filled: !existing?.fillYn,
    grassData: {
      ...grassData,
      [date]: {
        date,
        data: [],
        fillYn: true,
      },
    },
  };
}
