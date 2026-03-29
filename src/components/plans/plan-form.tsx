"use client";

import { useMemo, useState } from "react";

import { Check, Plus } from "@/components/icons";
import { BIBLE_CATEGORY_KEYS, CATEGORY_BOOK_CODES, type BibleCategoryKey } from "@/utils/bible-categories";
import { getBookName } from "@/services/bible";
import { BIBLE_BOOKS, calcTotalReadCount, createDefaultPlanDates } from "@/lib/plan";
import { useAppSettings } from "@/contexts/app-settings";
import { useI18n } from "@/utils/i18n";

type PlanFormValues = {
  planName: string;
  startDate: string;
  endDate: string;
  selectedBookCodes: string[];
};

type PlanFormProps = {
  initialValues?: PlanFormValues;
  submitLabel: string;
  onSubmit: (values: PlanFormValues) => void;
};

export function PlanForm({ initialValues, submitLabel, onSubmit }: PlanFormProps) {
  const { appLanguage } = useAppSettings();
  const { t } = useI18n();
  const defaultDates = useMemo(() => createDefaultPlanDates(), []);
  const [planName, setPlanName] = useState(initialValues?.planName ?? "");
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? defaultDates.startDate);
  const [endDate, setEndDate] = useState(initialValues?.endDate ?? defaultDates.endDate);
  const [selectedBookCodes, setSelectedBookCodes] = useState<Set<string>>(
    new Set(initialValues?.selectedBookCodes ?? []),
  );
  const [category, setCategory] = useState<BibleCategoryKey>("ot");

  const booksToShow = useMemo(() => {
    const allowedCodes = new Set(CATEGORY_BOOK_CODES[category]);
    return BIBLE_BOOKS.filter((book) => allowedCodes.has(book.bookCode));
  }, [category]);

  const selectedCodes = useMemo(() => [...selectedBookCodes], [selectedBookCodes]);
  const totalChapters = useMemo(() => calcTotalReadCount(selectedCodes), [selectedCodes]);
  const isDateRangeInvalid = endDate.trim().length > 0 && endDate <= startDate;
  const canSubmit = selectedBookCodes.size > 0 && endDate.trim().length > 0 && !isDateRangeInvalid;

  const toggleBook = (bookCode: string) => {
    setSelectedBookCodes((previous) => {
      const next = new Set(previous);
      if (next.has(bookCode)) next.delete(bookCode);
      else next.add(bookCode);
      return next;
    });
  };

  const toggleSelectAllByCategory = () => {
    setSelectedBookCodes((previous) => {
      const next = new Set(previous);
      const allSelected = booksToShow.every((book) => next.has(book.bookCode));
      if (allSelected) booksToShow.forEach((book) => next.delete(book.bookCode));
      else booksToShow.forEach((book) => next.add(book.bookCode));
      return next;
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      planName: planName.trim() || t("mypage.planDetailTitle"),
      startDate,
      endDate,
      selectedBookCodes: [...selectedBookCodes],
    });
  };

  const categoryLabel =
    category === "ot"
      ? t("bibleDrawer.oldTestament")
      : category === "nt"
        ? t("bibleDrawer.newTestament")
        : t(`bibleDrawer.category.${category}`);

  return (
    <div className="space-y-5">
      <label className="form-control gap-2">
        <span className="label-text font-medium">{t("planDrawer.planNameLabel")}</span>
        <input
          value={planName}
          onChange={(event) => setPlanName(event.target.value)}
          placeholder={t("planDrawer.planNamePlaceholder")}
          className="input input-bordered w-full"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="form-control gap-2">
          <span className="label-text font-medium">{t("planDrawer.startDateLabel")}</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="input input-bordered w-full"
          />
        </label>

        <label className="form-control gap-2">
          <span className="label-text font-medium">{t("planDrawer.endDateLabel")}</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="input input-bordered w-full"
          />
        </label>
      </div>

      {isDateRangeInvalid ? <p className="text-sm text-error">{t("planDrawer.invalidDateRange")}</p> : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="label-text font-medium">
            {t("planDrawer.selectBooksLabel")} ({selectedBookCodes.size} / {totalChapters})
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {BIBLE_CATEGORY_KEYS.map((categoryKey) => {
            const selected = categoryKey === category;
            const label =
              categoryKey === "ot"
                ? t("bibleDrawer.oldTestament")
                : categoryKey === "nt"
                  ? t("bibleDrawer.newTestament")
                  : t(`bibleDrawer.category.${categoryKey}`);
            return (
              <button
                key={categoryKey}
                type="button"
                className={`btn btn-sm ${selected ? "btn-primary" : "btn-ghost border border-base-300"}`}
                onClick={() => setCategory(categoryKey)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button type="button" className="btn btn-sm btn-ghost border border-base-300" onClick={toggleSelectAllByCategory}>
          <Plus className="size-4" />
          {categoryLabel} {t("planDrawer.selectAll")}
        </button>

        <div className="flex flex-wrap gap-2">
          {booksToShow.map((book) => {
            const selected = selectedBookCodes.has(book.bookCode);
            return (
              <button
                key={book.bookCode}
                type="button"
                className={`btn btn-sm ${selected ? "btn-primary" : "btn-outline"}`}
                onClick={() => toggleBook(book.bookCode)}
              >
                {getBookName(book.bookCode, appLanguage)} ({book.maxChapter})
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" className="btn btn-primary w-full" disabled={!canSubmit} onClick={handleSubmit}>
        <Check className="size-4" />
        {submitLabel}
      </button>
    </div>
  );
}
