"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { useI18n } from "@/utils/i18n";
import { useAppStore } from "@/store/app-store";
import { formatShortDateTime } from "@/lib/date";

function buildPrayerLabel(
  requester: string,
  target: string,
  t: (key: string) => string,
) {
  const trimmedRequester = requester.trim();
  const trimmedTarget = target.trim();
  if (trimmedTarget && trimmedRequester && trimmedRequester !== trimmedTarget) {
    return t("mypage.prayerRequestedForFormat")
      .replace("{requester}", trimmedRequester)
      .replace("{target}", trimmedTarget);
  }
  if (trimmedTarget || trimmedRequester) {
    return t("mypage.prayerForTargetFormat").replace("{target}", trimmedTarget || trimmedRequester);
  }
  return "-";
}

export default function PrayersPage() {
  const { t } = useI18n();
  const prayers = useAppStore((state) => state.prayers);

  return (
    <div className="min-h-screen bg-base-100">
      <PageHeader
        title={t("mypage.prayersTitle")}
        actions={
          <Link href="/prayers/add" className="btn btn-sm btn-primary">
            <Plus className="size-4" />
            {t("mypage.addPrayer")}
          </Link>
        }
      />

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
