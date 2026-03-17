"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/hooks/use-toast";
import { formatShortDateTime } from "@/lib/date";
import { useAppStore } from "@/store/app-store";
import { useI18n } from "@/utils/i18n";

export default function PrayerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const prayer = useAppStore((state) => state.prayers.find((item) => item.id === params.id));
  const deletePrayer = useAppStore((state) => state.deletePrayer);
  const deletePrayerContent = useAppStore((state) => state.deletePrayerContent);

  if (!prayer) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-base-100">
      <PageHeader
        title={t("mypage.prayerDetailTitle")}
        actions={
          <>
            <Link href={`/prayers/${prayer.id}/edit`} className="btn btn-sm btn-primary">
              <Pencil className="size-4" />
              {t("mypage.editPrayer")}
            </Link>
            <button
              type="button"
              className="btn btn-sm btn-error"
              onClick={() => {
                deletePrayer(prayer.id);
                showToast(t("toast.prayerDeleted"));
                router.back();
              }}
            >
              <Trash2 className="size-4" />
              {t("mypage.deletePrayer")}
            </button>
          </>
        }
      />

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
                      onClick={() => {
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
