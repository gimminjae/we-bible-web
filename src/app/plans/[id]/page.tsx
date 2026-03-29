"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BookOpenCheck, BookOpenText, Check, Pencil, Trash2 } from "@/components/icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAppSettings } from "@/contexts/app-settings";
import { useBibleGrass } from "@/hooks/use-bible-grass";
import { useDrawer } from "@/hooks/use-drawer";
import { useHeader } from "@/hooks/use-header";
import { usePlans } from "@/hooks/use-plans";
import { useToast } from "@/hooks/use-toast";
import { BIBLE_BOOKS, updatePlanComputedFields } from "@/lib/plan";
import { getBookName } from "@/services/bible";
import { useI18n } from "@/utils/i18n";

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { appLanguage } = useAppSettings();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { plans, deletePlan, updatePlanGoalStatus, isLoading, error } = usePlans();
  const { isLoading: isGrassLoading, error: grassError } = useBibleGrass();
  const plan = plans.find((item) => item.id === params.id);
  const [activeTab, setActiveTab] = useState<"ot" | "nt">("ot");
  const [selectedBookIndex, setSelectedBookIndex] = useState<number | null>(null);
  const [localStatus, setLocalStatus] = useState<number[]>([]);
  const bookEditorDrawer = useDrawer();

  useHeader(
    () => ({
      title: plan ? updatePlanComputedFields(plan).planName : t("mypage.planDetailTitle"),
      eyebrow: t("common.back"),
      showBack: true,
      actions: plan ? (
        <>
          <Link href={`/plans/${plan.id}/edit`} className="btn btn-sm btn-primary">
            <Pencil className="size-4" />
            {t("mypage.editPlan")}
          </Link>
          <button
            type="button"
            className="btn btn-sm btn-error"
            onClick={() => {
              deletePlan(plan.id);
              showToast(t("toast.planDeleted"));
              router.back();
            }}
          >
            <Trash2 className="size-4" />
            {t("mypage.deletePlan")}
          </button>
        </>
      ) : null,
    }),
    [deletePlan, plan, router, showToast, t],
  );

  const selectedBook = useMemo(() => (selectedBookIndex === null ? null : BIBLE_BOOKS[selectedBookIndex]), [selectedBookIndex]);

  if (error ?? grassError) {
    return <LoadingScreen message={error ?? grassError ?? "PLAN_DATA_LOAD_FAILED"} />;
  }

  if (isLoading || isGrassLoading) {
    return <LoadingScreen message="Loading plan..." />;
  }

  if (!plan) {
    notFound();
  }

  const currentPlan = updatePlanComputedFields(plan);
  const selectedOtBooks = BIBLE_BOOKS.filter((book) => book.bookSeq <= 39 && currentPlan.selectedBookCodes.includes(book.bookCode));
  const selectedNtBooks = BIBLE_BOOKS.filter((book) => book.bookSeq >= 40 && currentPlan.selectedBookCodes.includes(book.bookCode));

  const openBookEditor = (bookCode: string) => {
    const bookIndex = BIBLE_BOOKS.findIndex((book) => book.bookCode === bookCode);
    if (bookIndex < 0) return;
    setSelectedBookIndex(bookIndex);
    setLocalStatus([...(currentPlan.goalStatus[bookIndex] ?? [])]);
    bookEditorDrawer.open();
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="space-y-3 px-4 py-5">
        <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <p className="text-sm font-medium text-base-content/50">{t("mypage.planPeriod")}</p>
          <p className="mt-2 text-base">{currentPlan.startDate} ~ {currentPlan.endDate}</p>
          <p className="mt-3 text-sm font-medium text-primary">{currentPlan.restDay} {t("mypage.planDaysRemaining")}</p>
        </section>

        <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <p className="text-sm font-medium text-base-content/50">{t("mypage.planGoal")}</p>
          <p className="mt-2 text-base">{currentPlan.selectedBookCodes.length} / {currentPlan.totalReadCount}</p>
        </section>

        <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <p className="text-sm font-medium text-base-content/50">{t("mypage.planProgress")}</p>
          <progress className="progress progress-primary mt-4 w-full" value={currentPlan.goalPercent} max={100} />
          <p className="mt-3 text-lg font-semibold text-primary">{currentPlan.goalPercent.toFixed(2)}%</p>
          <p className="mt-1 text-sm text-base-content/60">{t("mypage.planChaptersPerDay").replace("{count}", currentPlan.readCountPerDay.toFixed(2))}</p>
        </section>

        <div className="tabs tabs-boxed bg-base-200">
          <button type="button" className={`tab flex-1 ${activeTab === "ot" ? "tab-active" : ""}`} onClick={() => setActiveTab("ot")}>
            <BookOpenText className="size-4" />
            {t("bibleDrawer.oldTestament")}
          </button>
          <button type="button" className={`tab flex-1 ${activeTab === "nt" ? "tab-active" : ""}`} onClick={() => setActiveTab("nt")}>
            <BookOpenCheck className="size-4" />
            {t("bibleDrawer.newTestament")}
          </button>
        </div>

        <div className="space-y-4">
          {(activeTab === "ot" ? selectedOtBooks : selectedNtBooks).length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 px-5 py-10 text-center text-sm text-base-content/55">
              {t("mypage.planNoSelectedBooks")}
            </div>
          ) : (
            (activeTab === "ot" ? selectedOtBooks : selectedNtBooks).map((book) => {
              const bookIndex = BIBLE_BOOKS.findIndex((item) => item.bookCode === book.bookCode);
              const chapters = currentPlan.goalStatus[bookIndex] ?? [];
              const readCount = chapters.filter((value) => value === 1).length;
              return (
                <section key={book.bookCode} className="rounded-[1.75rem] border border-base-300 bg-base-100 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{getBookName(book.bookCode, appLanguage)}</p>
                      <p className="text-sm text-base-content/55">{readCount}/{book.maxChapter}</p>
                    </div>
                    <button type="button" className="btn btn-sm btn-ghost border border-base-300" onClick={() => openBookEditor(book.bookCode)}>
                      <Pencil className="size-4" />
                      {t("mypage.editPlan")}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: book.maxChapter }, (_, index) => index + 1).map((chapter) => {
                      const read = chapters[chapter - 1] === 1;
                      return (
                        <button
                          key={chapter}
                          type="button"
                          className={`btn btn-xs size-8 rounded-xl p-0 ${read ? "btn-success" : "btn-outline"}`}
                          onClick={() => openBookEditor(book.bookCode)}
                        >
                          {chapter}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>

      <BottomSheet
        open={bookEditorDrawer.isOpen && !!selectedBook}
        onClose={bookEditorDrawer.close}
        onAfterClose={() => setSelectedBookIndex(null)}
        title={selectedBook ? getBookName(selectedBook.bookCode, appLanguage) : ""}
      >
        {selectedBook ? (
          <div className="space-y-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: selectedBook.maxChapter }, (_, index) => index).map((chapterIndex) => {
                const read = localStatus[chapterIndex] === 1;
                return (
                  <button
                    key={chapterIndex}
                    type="button"
                    className={`btn btn-sm size-10 rounded-xl p-0 ${read ? "btn-success" : "btn-outline"}`}
                    onClick={() =>
                      setLocalStatus((previous) => previous.map((value, index) => (index === chapterIndex ? (value === 1 ? 0 : 1) : value)))
                    }
                  >
                    {chapterIndex + 1}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const bookIndex = selectedBookIndex!;
                  const previousGoalStatus = currentPlan.goalStatus.map((item) => [...item]);
                  const nextGoalStatus = currentPlan.goalStatus.map((item, index) => (index === bookIndex ? [...localStatus] : item));
                  updatePlanGoalStatus(currentPlan.id, nextGoalStatus, {
                    selectedBookCodes: currentPlan.selectedBookCodes,
                    previousGoalStatus,
                  });
                  showToast(t("toast.planUpdated"));
                  bookEditorDrawer.close();
                }}
              >
                <Check className="size-4" />
                {t("mypage.savePlan")}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  setLocalStatus((previous) => {
                    const allRead = previous.every((value) => value === 1);
                    return previous.map(() => (allRead ? 0 : 1));
                  })
                }
              >
                <Check className="size-4" />
                {t("mypage.checkAll")}
              </button>
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
