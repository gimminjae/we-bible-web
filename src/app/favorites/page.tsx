"use client";

import { Copy, Heart, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { copyText } from "@/lib/clipboard";
import { formatShortDateTime } from "@/lib/date";
import { getBookName } from "@/services/bible";
import { useAppSettings } from "@/contexts/app-settings";
import { useHeader } from "@/hooks/use-header";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { useI18n } from "@/utils/i18n";

export default function FavoritesPage() {
  const router = useRouter();
  const { appLanguage } = useAppSettings();
  const { t } = useI18n();
  const { showToast } = useToast();
  const favorites = useAppStore((state) => state.favorites);
  const goToBookChapter = useAppStore((state) => state.goToBookChapter);
  const removeFavorites = useAppStore((state) => state.removeFavorites);

  useHeader(
    () => ({
      title: t("mypage.favoritesTitle"),
      eyebrow: t("common.back"),
      showBack: true,
    }),
    [t],
  );

  const sortedFavorites = [...favorites].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return (
    <div className="min-h-screen bg-base-100">
      <div className="space-y-3 px-4 py-5">
        {sortedFavorites.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 px-5 py-10 text-center text-sm text-base-content/55">
            {t("mypage.emptyFavorites")}
          </div>
        ) : (
          sortedFavorites.map((item) => (
            <div key={`${item.bookCode}-${item.chapter}-${item.verse}`} className="rounded-[1.75rem] border border-base-300 bg-base-100 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => {
                    goToBookChapter(item.bookCode, item.chapter);
                    router.replace("/");
                  }}
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Heart className="size-4 fill-current" />
                    {getBookName(item.bookCode, appLanguage)} {item.chapter}:{item.verse}
                  </p>
                  <p className="mt-3 text-base leading-7">{item.verseText}</p>
                  <p className="mt-3 text-xs text-base-content/45">{formatShortDateTime(item.createdAt)}</p>
                </button>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost btn-circle border border-base-300"
                    onClick={async () => {
                      await copyText(`${item.verseText}\n${getBookName(item.bookCode, appLanguage)} ${item.chapter}:${item.verse}`);
                      showToast(t("toast.copySuccess"));
                    }}
                  >
                    <Copy className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost btn-circle border border-base-300"
                    onClick={() => {
                      removeFavorites(item.bookCode, item.chapter, [item.verse]);
                      showToast(t("toast.favoriteRemoved"));
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
