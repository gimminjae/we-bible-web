"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Heart, HeartOff, NotebookPen, Type } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MemoSheet } from "@/components/memos/memo-sheet";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAppSettings } from "@/contexts/app-settings";
import { useBibleState } from "@/hooks/use-bible-state";
import { useFavorites } from "@/hooks/use-favorites";
import { useDrawer } from "@/hooks/use-drawer";
import { useBibleQuery } from "@/hooks/use-bible-query";
import { useHeader } from "@/hooks/use-header";
import { useMemos } from "@/hooks/use-memos";
import { useToast } from "@/hooks/use-toast";
import { copyText } from "@/lib/clipboard";
import { BIBLE_BOOKS } from "@/lib/plan";
import { getBookName, versions } from "@/services/bible";
import { getFavoriteVerseNumbers, getMemoVerseNumbers } from "@/store/app-store";
import { makeCopyBibles } from "@/utils/bible.util";
import { BIBLE_CATEGORY_KEYS, CATEGORY_BOOK_CODES, type BibleCategoryKey } from "@/utils/bible-categories";
import { useI18n } from "@/utils/i18n";

function isCopyVerseItem(
  value: { verse: number; content: string; bookName: string; chapter: number } | null,
): value is { verse: number; content: string; bookName: string; chapter: number } {
  return value !== null;
}

export default function BibleReaderPage() {
  const { appLanguage } = useAppSettings();
  const { t } = useI18n();
  const { showToast } = useToast();

  const { bible, setBibleState, goToBookChapter, isLoading: isBibleStateLoading, error: bibleStateError } = useBibleState();
  const { favorites, addFavorites, removeFavorites, isLoading: isFavoritesLoading, error: favoritesError } = useFavorites();
  const { memos, addMemo, isLoading: isMemosLoading, error: memosError } = useMemos();

  const chapterScope = `${bible.bookCode}:${bible.chapter}`;
  const [selectionState, setSelectionState] = useState<{ scope: string; verses: number[] }>({
    scope: chapterScope,
    verses: [],
  });
  const bookPickerDrawer = useDrawer();
  const [bookPickerStep, setBookPickerStep] = useState<"book" | "chapter">("book");
  const [bookPickerCategory, setBookPickerCategory] = useState<BibleCategoryKey>("ot");
  const [pickerBookCode, setPickerBookCode] = useState(bible.bookCode);
  const languagePickerDrawer = useDrawer();
  const settingsDrawer = useDrawer();
  const memoDrawer = useDrawer();
  const [secondarySelectorOpen, setSecondarySelectorOpen] = useState(false);

  const selectedVerses = useMemo(
    () => (selectionState.scope === chapterScope ? selectionState.verses : []),
    [chapterScope, selectionState],
  );

  const currentBook = useMemo(
    () => BIBLE_BOOKS.find((book) => book.bookCode === bible.bookCode) ?? BIBLE_BOOKS[0],
    [bible.bookCode],
  );
  const pickerBook = useMemo(
    () => BIBLE_BOOKS.find((book) => book.bookCode === pickerBookCode) ?? currentBook,
    [currentBook, pickerBookCode],
  );

  const { data: verses = [], isLoading, error } = useBibleQuery({
    bookCode: bible.bookCode,
    chapter: bible.chapter,
    primaryLang: bible.primaryLang,
    dualLang: bible.dualLang,
    secondaryLang: bible.secondaryLang,
  });

  const favoriteVerseNumbers = useMemo(
    () => getFavoriteVerseNumbers(favorites, bible.bookCode, bible.chapter),
    [bible.bookCode, bible.chapter, favorites],
  );
  const memoVerseNumbers = useMemo(
    () => getMemoVerseNumbers(memos, bible.bookCode, bible.chapter),
    [bible.bookCode, bible.chapter, memos],
  );
  const filteredBooks = useMemo(() => {
    const allowedCodes = new Set(CATEGORY_BOOK_CODES[bookPickerCategory]);
    return BIBLE_BOOKS.filter((book) => allowedCodes.has(book.bookCode));
  }, [bookPickerCategory]);

  const bookName = getBookName(bible.bookCode, appLanguage);
  const langLabel = versions.find((item) => item.val === bible.primaryLang)?.txt ?? bible.primaryLang;
  const allSelectedAreFavorites =
    selectedVerses.length > 0 && selectedVerses.every((verse) => favoriteVerseNumbers.includes(verse));
  const domainError = bibleStateError ?? favoritesError ?? memosError;
  const isDomainLoading = isBibleStateLoading || isFavoritesLoading || isMemosLoading;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [bible.bookCode, bible.chapter]);

  useHeader(
    () => ({
      content: (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 overflow-x-auto">
            <button
              type="button"
              className="btn btn-sm btn-primary rounded-2xl"
              onClick={() => {
                setBookPickerStep("book");
                setBookPickerCategory("ot");
                setPickerBookCode(bible.bookCode);
                bookPickerDrawer.open();
              }}
            >
              {bookName} {bible.chapter}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost rounded-2xl border border-base-300"
              onClick={languagePickerDrawer.open}
            >
              {langLabel}
            </button>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-ghost btn-circle border border-base-300"
            onClick={settingsDrawer.open}
          >
            <Type className="size-4" />
          </button>
        </div>
      ),
    }),
    [bible.bookCode, bible.chapter, bookName, langLabel],
  );

  const memoInitialContent = useMemo(() => {
    if (!selectedVerses.length) return "";
    const contentList = [...new Set(selectedVerses)]
      .sort((left, right) => left - right)
      .map((verseNumber) => {
        const verse = verses.find((item) => item.verse === verseNumber);
        if (!verse) return null;
        return {
          verse: verse.verse,
          content: verse.primary,
          bookName,
          chapter: bible.chapter,
        };
      })
      .filter(isCopyVerseItem);

    return makeCopyBibles(contentList);
  }, [bible.chapter, bookName, selectedVerses, verses]);

  if (domainError) {
    return <LoadingScreen message={domainError} />;
  }

  if (isDomainLoading) {
    return <LoadingScreen message="Loading reading data..." />;
  }

  const updateSelection = (versesToStore: number[]) => {
    setSelectionState({
      scope: chapterScope,
      verses: versesToStore,
    });
  };

  const toggleVerseSelection = (verseNumber: number) => {
    const scopedVerses = selectionState.scope === chapterScope ? selectionState.verses : [];
    updateSelection(
      scopedVerses.includes(verseNumber)
        ? scopedVerses.filter((value) => value !== verseNumber)
        : [...scopedVerses, verseNumber],
    );
  };

  const handleCopy = async () => {
    const contentList = [...new Set(selectedVerses)]
      .sort((left, right) => left - right)
      .map((verseNumber) => {
        const verse = verses.find((item) => item.verse === verseNumber);
        if (!verse) return null;
        return {
          verse: verse.verse,
          content: verse.primary,
          bookName,
          chapter: bible.chapter,
        };
      })
      .filter(isCopyVerseItem);

    const content = makeCopyBibles(contentList);
    if (!content) return;
    await copyText(content);
    updateSelection([]);
    showToast(t("toast.copySuccess"));
  };

  const handleFavoriteToggle = () => {
    if (!selectedVerses.length) return;
    if (allSelectedAreFavorites) {
      removeFavorites(bible.bookCode, bible.chapter, selectedVerses);
      showToast(t("toast.favoriteRemoved"));
    } else {
      addFavorites(
        bible.bookCode,
        bible.chapter,
        selectedVerses
          .map((verseNumber) => {
            const verse = verses.find((item) => item.verse === verseNumber);
            return verse ? { verse: verseNumber, text: verse.primary } : null;
          })
          .filter((value): value is { verse: number; text: string } => value !== null),
      );
      showToast(t("toast.favoriteAdded"));
    }
    updateSelection([]);
  };

  const handleSaveMemo = (title: string, content: string) => {
    addMemo({
      title,
      content,
      verseText: memoInitialContent,
      bookCode: bible.bookCode,
      chapter: bible.chapter,
      verseNumbers: selectedVerses,
    });
    updateSelection([]);
    showToast(t("toast.memoAdded"));
  };

  const handlePreviousChapter = () => {
    const currentIndex = BIBLE_BOOKS.findIndex((book) => book.bookCode === bible.bookCode);
    if (bible.chapter > 1) {
      goToBookChapter(bible.bookCode, bible.chapter - 1);
      return;
    }
    if (currentIndex > 0) {
      const previousBook = BIBLE_BOOKS[currentIndex - 1];
      goToBookChapter(previousBook.bookCode, previousBook.maxChapter);
    }
  };

  const handleNextChapter = () => {
    const currentIndex = BIBLE_BOOKS.findIndex((book) => book.bookCode === bible.bookCode);
    if (bible.chapter < currentBook.maxChapter) {
      goToBookChapter(bible.bookCode, bible.chapter + 1);
      return;
    }
    if (currentIndex >= 0 && currentIndex < BIBLE_BOOKS.length - 1) {
      goToBookChapter(BIBLE_BOOKS[currentIndex + 1].bookCode, 1);
    }
  };

  const handlePrimaryLanguageSelect = (language: "ko" | "en" | "de") => {
    const fallbackSecondary =
      bible.secondaryLang === language ? ((versions.find((item) => item.val !== language)?.val as "ko" | "en" | "de") ?? "en") : bible.secondaryLang;
    setBibleState({
      primaryLang: language,
      secondaryLang: fallbackSecondary,
      dualLang: false,
    });
    languagePickerDrawer.close();
  };

  return (
    <div className="relative min-h-screen bg-base-100">
      <div className="px-4 pb-28 pt-5">
        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-error/20 bg-error/10 p-4 text-sm text-error">
            {error instanceof Error ? error.message : "Failed to load"}
          </div>
        ) : (
          <div className="space-y-3">
            {verses.map((verse) => {
              const selected = selectedVerses.includes(verse.verse);
              const favorite = favoriteVerseNumbers.includes(verse.verse);
              const memo = memoVerseNumbers.includes(verse.verse);

              return (
                <button
                  key={verse.verse}
                  type="button"
                  className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${selected ? "border-primary bg-primary/8" : "border-base-300 bg-base-100 hover:bg-base-200/60"}`}
                  onClick={() => toggleVerseSelection(verse.verse)}
                >
                  <div className="flex gap-4">
                    <div className="flex min-w-10 flex-col items-center gap-2 pt-1">
                      <span className="text-sm font-semibold text-base-content/80">{verse.verse}</span>
                      <div className="flex items-center gap-1 text-xs">
                        <Heart className={`size-3 ${favorite ? "fill-current text-pink-500" : "text-base-content/20"}`} />
                        <NotebookPen className={`size-3 ${memo ? "text-amber-500" : "text-base-content/20"}`} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-base leading-7 ${selected ? "underline decoration-dotted underline-offset-4" : ""}`}
                        style={{ fontSize: `${1 * bible.fontScale}rem` }}
                      >
                        {verse.primary}
                      </p>
                      {bible.dualLang && verse.secondary ? (
                        <p
                          className="mt-2 text-sm leading-6 text-base-content/65"
                          style={{ fontSize: `${0.92 * bible.fontScale}rem` }}
                        >
                          {verse.secondary}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedVerses.length ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-base-300 bg-base-100 px-3 py-3 shadow-2xl shadow-stone-950/10">
            <button type="button" className="btn btn-circle btn-sm btn-ghost border border-base-300" onClick={handleFavoriteToggle}>
              {allSelectedAreFavorites ? <HeartOff className="size-4" /> : <Heart className="size-4" />}
            </button>
            <button type="button" className="btn btn-circle btn-sm btn-ghost border border-base-300" onClick={memoDrawer.open}>
              <NotebookPen className="size-4" />
            </button>
            <button type="button" className="btn btn-primary rounded-full px-5" onClick={handleCopy}>
              {t("common.copy")}
            </button>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-4">
            <button type="button" className="btn btn-circle btn-primary shadow-lg" onClick={handlePreviousChapter}>
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" className="btn btn-circle btn-primary shadow-lg" onClick={handleNextChapter}>
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      <BottomSheet open={bookPickerDrawer.isOpen} onClose={bookPickerDrawer.close}>
        {bookPickerStep === "book" ? (
          <div className="space-y-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {BIBLE_CATEGORY_KEYS.map((category) => {
                const label =
                  category === "ot"
                    ? t("bibleDrawer.oldTestament")
                    : category === "nt"
                      ? t("bibleDrawer.newTestament")
                      : t(`bibleDrawer.category.${category}`);
                return (
                  <button
                    key={category}
                    type="button"
                    className={`btn btn-sm ${bookPickerCategory === category ? "btn-primary" : "btn-ghost border border-base-300"}`}
                    onClick={() => setBookPickerCategory(category)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-2">
              {filteredBooks.map((book) => (
                <button
                  key={book.bookCode}
                  type="button"
                  className="btn btn-ghost justify-between border border-base-300"
                  onClick={() => {
                    setPickerBookCode(book.bookCode);
                    setBookPickerStep("chapter");
                  }}
                >
                  <span>{getBookName(book.bookCode, appLanguage)}</span>
                  <span className="text-xs text-base-content/50">{book.maxChapter}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            <div className="flex items-center justify-between">
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setBookPickerStep("book")}>
                {t("common.back")}
              </button>
              <h3 className="text-sm font-semibold">{getBookName(pickerBook.bookCode, appLanguage)}</h3>
              <span />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: pickerBook.maxChapter }, (_, index) => index + 1).map((chapter) => (
                <button
                  key={chapter}
                  type="button"
                  className={`btn btn-sm ${chapter === bible.chapter && pickerBook.bookCode === bible.bookCode ? "btn-primary" : "btn-outline"}`}
                  onClick={() => {
                    goToBookChapter(pickerBook.bookCode, chapter);
                    bookPickerDrawer.close();
                    setBookPickerStep("book");
                  }}
                >
                  {chapter}
                </button>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={languagePickerDrawer.isOpen} onClose={languagePickerDrawer.close} title={t("settings.languageSelect")}>
        <div className="grid gap-2 pb-4">
          {versions.map((option) => (
            <button
              key={option.val}
              type="button"
              className="btn btn-ghost justify-start border border-base-300"
              onClick={() => handlePrimaryLanguageSelect(option.val as "ko" | "en" | "de")}
            >
              {option.txt} ({option.description})
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={settingsDrawer.isOpen} onClose={settingsDrawer.close}>
        <div className="space-y-5 pb-4">
          <div className="flex items-center justify-between rounded-[1.5rem] border border-base-300 bg-base-200 px-4 py-4">
            <div>
              <p className="font-medium">Dual language</p>
              <p className="text-sm text-base-content/60">Show a second translation under the main verse.</p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={bible.dualLang}
              onChange={(event) => {
                const nextValue = event.target.checked;
                const fallbackSecondary =
                  nextValue && bible.secondaryLang === bible.primaryLang
                    ? ((versions.find((item) => item.val !== bible.primaryLang)?.val as "ko" | "en" | "de") ?? "en")
                    : bible.secondaryLang;
                setBibleState({ dualLang: nextValue, secondaryLang: fallbackSecondary });
              }}
            />
          </div>

          {bible.dualLang ? (
            <div className="space-y-2">
              <p className="label-text font-medium">Secondary language</p>
              <button
                type="button"
                className="btn btn-ghost w-full justify-between border border-base-300"
                onClick={() => setSecondarySelectorOpen((previous) => !previous)}
              >
                <span>{versions.find((item) => item.val === bible.secondaryLang)?.txt ?? "English"}</span>
                <ChevronDown className="size-4 text-base-content/50" />
              </button>
              {secondarySelectorOpen ? (
                <div className="grid gap-2 rounded-[1.5rem] border border-base-300 bg-base-200 p-2">
                  {versions
                    .filter((option) => option.val !== bible.primaryLang)
                    .map((option) => (
                      <button
                        key={option.val}
                        type="button"
                        className="btn btn-ghost justify-start"
                        onClick={() => {
                          setBibleState({ secondaryLang: option.val as "ko" | "en" | "de" });
                          setSecondarySelectorOpen(false);
                        }}
                      >
                        {option.txt} ({option.description})
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">Font size</p>
              <span className="text-sm font-semibold text-primary">{Math.round(bible.fontScale * 100)}%</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[0.8, 0.9, 1, 1.1, 1.2].map((step) => (
                <button
                  key={step}
                  type="button"
                  className={`btn btn-sm ${bible.fontScale === step ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setBibleState({ fontScale: step })}
                >
                  {Math.round(step * 100)}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>

      <MemoSheet key={memoDrawer.version} open={memoDrawer.isOpen} onClose={memoDrawer.close} initialVerseText={memoInitialContent} onSave={handleSaveMemo} />
    </div>
  );
}
