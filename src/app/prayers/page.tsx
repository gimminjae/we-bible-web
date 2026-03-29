"use client";

import Link from "next/link";

import { Plus } from "@/components/icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useHeader } from "@/hooks/use-header";
import { usePrayers } from "@/hooks/use-prayers";
import { useI18n } from "@/utils/i18n";
import { formatShortDateTime } from "@/lib/date";
import { buildPrayerLabel } from "@/lib/prayer";

export default function PrayersPage() {
  const { t } = useI18n();
  const { prayers, isLoading, error } = usePrayers();

  useHeader(
    () => ({
      title: t("mypage.prayersTitle"),
      eyebrow: t("common.back"),
      showBack: true,
      actions: (
        <Link href="/prayers/add" className="btn btn-sm btn-primary">
          <Plus className="size-4" />
          {t("mypage.addPrayer")}
        </Link>
      ),
    }),
    [t],
  );

  if (error) {
    return <LoadingScreen message={error} />;
  }

  if (isLoading) {
    return <LoadingScreen message="Loading prayers..." />;
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="space-y-3 px-4 py-5">
        {prayers.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 px-5 py-10 text-center text-sm text-base-content/55">
            {t("mypage.emptyPrayers")}
          </div>
        ) : (
          prayers.map((prayer) => {
            const latest = prayer.contents[0];
            return (
              <Link key={prayer.id} href={`/prayers/${prayer.id}`} className="block rounded-[1.75rem] border border-base-300 bg-base-100 p-4 shadow-sm transition hover:bg-base-200/50">
                <p className="text-sm font-semibold text-primary">{buildPrayerLabel(prayer.requester, prayer.target, t)}</p>
                <p className="mt-3 text-base leading-7">{latest?.content || "-"}</p>
                <p className="mt-3 text-xs text-base-content/45">{formatShortDateTime(latest?.registeredAt || prayer.createdAt)}</p>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
