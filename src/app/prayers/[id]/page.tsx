"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";

import { Pencil, Trash2 } from "@/components/icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useConfirm } from "@/hooks/use-confirm";
import { useHeader } from "@/hooks/use-header";
import { usePrayers } from "@/hooks/use-prayers";
import { useToast } from "@/hooks/use-toast";
import { formatShortDateTime } from "@/lib/date";
import { useI18n } from "@/utils/i18n";

export default function PrayerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { confirmDestructive } = useConfirm();
  const { prayers, deletePrayer, deletePrayerContent, isLoading, error } = usePrayers();
  const prayer = prayers.find((item) => item.id === params.id);

  useHeader(
    () => ({
      title: t("mypage.prayerDetailTitle"),
      eyebrow: t("common.back"),
      showBack: true,
      actions: prayer ? (
        <>
          <Link href={`/prayers/${prayer.id}/edit`} className="btn btn-sm btn-primary">
            <Pencil className="size-4" />
            {t("mypage.editPrayer")}
          </Link>
          <button
            type="button"
            className="btn btn-sm btn-error"
            onClick={async () => {
              const confirmed = await confirmDestructive({
                message: t("mypage.deletePrayerConfirm"),
                confirmText: t("mypage.deletePrayer"),
                cancelText: t("mypage.deleteCancel"),
              });
              if (!confirmed) return;
              deletePrayer(prayer.id);
              showToast(t("toast.prayerDeleted"));
              router.back();
            }}
          >
            <Trash2 className="size-4" />
            {t("mypage.deletePrayer")}
          </button>
        </>
      ) : null,
    }),
    [confirmDestructive, deletePrayer, prayer, router, showToast, t],
  );

  if (error) {
    return <LoadingScreen message={error} />;
  }

  if (isLoading) {
    return <LoadingScreen message="Loading prayer..." />;
  }

  if (!prayer) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="space-y-3 px-4 py-5">
        <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <p className="text-sm font-medium text-base-content/50">{t("mypage.prayerRequester")}</p>
          <p className="mt-2 text-base font-semibold">{prayer.requester || "-"}</p>
          <p className="mt-5 text-sm font-medium text-base-content/50">{t("mypage.prayerTarget")}</p>
          <p className="mt-2 text-base font-semibold">{prayer.target || "-"}</p>
        </section>

        <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <p className="text-sm font-medium text-base-content/50">{t("mypage.prayerContent")}</p>
          <div className="mt-4 space-y-4">
            {prayer.contents.length === 0 ? (
              <p className="text-sm text-base-content/55">{t("mypage.noContent")}</p>
            ) : (
              prayer.contents.map((content) => (
                <div key={content.id} className="rounded-2xl border border-base-300 bg-base-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm leading-7">{content.content}</p>
                      <p className="mt-3 text-xs text-base-content/45">{formatShortDateTime(content.registeredAt)}</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn-circle border border-base-300"
                      onClick={async () => {
                        const confirmed = await confirmDestructive({
                          message: t("mypage.deletePrayerContentConfirm"),
                          confirmText: t("mypage.deleteConfirm"),
                          cancelText: t("mypage.deleteCancel"),
                        });
                        if (!confirmed) return;
                        deletePrayerContent(prayer.id, content.id);
                        showToast(t("toast.prayerContentDeleted"));
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
