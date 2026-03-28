"use client";

import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAppSettings } from "@/contexts/app-settings";
import { BIBLE_BOOKS, type GoalStatus } from "@/lib/plan";
import type { SharedPlanMemberProgress } from "@/lib/church";
import { getBookName } from "@/services/bible";
import { useI18n } from "@/utils/i18n";

type SharedPlanProgressSheetProps = {
  open: boolean;
  onClose: () => void;
  memberProgress: SharedPlanMemberProgress | null;
  canEdit: boolean;
  onSave: (goalStatus: GoalStatus) => Promise<void> | void;
};

export function SharedPlanProgressSheet({
  open,
  onClose,
  memberProgress,
  canEdit,
  onSave,
}: SharedPlanProgressSheetProps) {
  const { appLanguage } = useAppSettings();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"ot" | "nt">("ot");
  const [localGoalStatus, setLocalGoalStatus] = useState<GoalStatus>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!memberProgress) {
      setLocalGoalStatus([]);
      return;
    }

    setLocalGoalStatus(memberProgress.plan.goalStatus.map((row) => [...row]));
  }, [memberProgress]);

  const selectedBookCodes = memberProgress?.plan.selectedBookCodes ?? [];
  const booksToRender = BIBLE_BOOKS.filter(
    (book) =>
      selectedBookCodes.includes(book.bookCode) &&
      (activeTab === "ot" ? book.bookSeq <= 39 : book.bookSeq >= 40),
  );

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        if (isSaving) return;
        onClose();
      }}
      title={memberProgress?.profile.displayName ?? ""}
    >
      {memberProgress ? (
        <div className="space-y-4 pb-4">
          <section className="rounded-[1.5rem] border border-base-300 bg-base-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-base-content/55">{t("mypage.planProgress")}</p>
                <p className="mt-1 text-xl font-semibold text-primary">{memberProgress.plan.goalPercent.toFixed(2)}%</p>
              </div>
              <div className="text-right text-sm text-base-content/60">
                <p>{memberProgress.plan.currentReadCount} / {memberProgress.plan.totalReadCount}</p>
                <p>{memberProgress.plan.restDay} {t("mypage.planDaysRemaining")}</p>
              </div>
            </div>
            <progress className="progress progress-primary mt-4 w-full" value={memberProgress.plan.goalPercent} max={100} />
          </section>

          <div className="tabs tabs-boxed bg-base-200">
            <button type="button" className={`tab flex-1 ${activeTab === "ot" ? "tab-active" : ""}`} onClick={() => setActiveTab("ot")}>
              {t("bibleDrawer.oldTestament")}
            </button>
            <button type="button" className={`tab flex-1 ${activeTab === "nt" ? "tab-active" : ""}`} onClick={() => setActiveTab("nt")}>
              {t("bibleDrawer.newTestament")}
            </button>
          </div>

          {booksToRender.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 px-5 py-10 text-center text-sm text-base-content/55">
              {t("mypage.planNoSelectedBooks")}
            </div>
          ) : (
            booksToRender.map((book) => {
              const bookIndex = BIBLE_BOOKS.findIndex((item) => item.bookCode === book.bookCode);
              const chapters = localGoalStatus[bookIndex] ?? [];
              const readCount = chapters.filter((value) => value === 1).length;

              return (
                <section key={book.bookCode} className="rounded-[1.75rem] border border-base-300 bg-base-100 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{getBookName(book.bookCode, appLanguage)}</p>
                      <p className="text-sm text-base-content/55">{readCount}/{book.maxChapter}</p>
                    </div>
                    {canEdit ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost border border-base-300"
                        onClick={() =>
                          setLocalGoalStatus((previous) =>
                            previous.map((row, index) =>
                                index === bookIndex
                                ? row.map(() => (row.every((chapter) => chapter === 1) ? 0 : 1))
                                : row,
                            ),
                          )
                        }
                      >
                        {t("mypage.checkAll")}
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: book.maxChapter }, (_entry, chapterIndex) => {
                      const read = chapters[chapterIndex] === 1;
                      return (
                        <button
                          key={chapterIndex}
                          type="button"
                          className={`btn btn-xs rounded-full ${read ? "btn-success" : "btn-outline"}`}
                          disabled={!canEdit}
                          onClick={() =>
                            canEdit
                              ? setLocalGoalStatus((previous) =>
                                  previous.map((row, index) =>
                                    index === bookIndex
                                      ? row.map((value, rowIndex) => (rowIndex === chapterIndex ? (value === 1 ? 0 : 1) : value))
                                      : row,
                                  ),
                                )
                              : undefined
                          }
                        >
                          {chapterIndex + 1}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}

          {canEdit ? (
            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={isSaving}
              onClick={async () => {
                setIsSaving(true);
                try {
                  await onSave(localGoalStatus);
                  onClose();
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              {t("mypage.savePlan")}
            </button>
          ) : null}
        </div>
      ) : null}
    </BottomSheet>
  );
}
