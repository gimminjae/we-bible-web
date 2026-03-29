"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Check } from "@/components/icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useHeader } from "@/hooks/use-header";
import { usePrayers } from "@/hooks/use-prayers";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/utils/i18n";

export default function AddPrayerPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { addPrayer, isLoading, error } = usePrayers();
  const [requester, setRequester] = useState("");
  const [target, setTarget] = useState("");
  const [content, setContent] = useState("");

  useHeader(
    () => ({
      title: t("prayerDrawer.addTitle"),
      eyebrow: t("common.back"),
      showBack: true,
      actions: (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={!content.trim()}
          onClick={() => {
            const id = addPrayer({ requester, target, content });
            showToast(t("toast.prayerAdded"));
            router.replace(`/prayers/${id}`);
          }}
        >
          <Check className="size-4" />
          {t("prayerDrawer.save")}
        </button>
      ),
    }),
    [addPrayer, content, requester, router, showToast, t, target],
  );

  if (error) {
    return <LoadingScreen message={error} />;
  }

  if (isLoading) {
    return <LoadingScreen message="Loading prayers..." />;
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="space-y-4 px-4 py-5">
        <label className="form-control gap-2">
          <span className="label-text font-medium">{t("prayerDrawer.requesterLabel")}</span>
          <input value={requester} onChange={(event) => setRequester(event.target.value)} placeholder={t("prayerDrawer.requesterPlaceholder")} className="input input-bordered w-full" />
        </label>
        <label className="form-control gap-2">
          <span className="label-text font-medium">{t("prayerDrawer.targetLabel")}</span>
          <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder={t("prayerDrawer.targetPlaceholder")} className="input input-bordered w-full" />
        </label>
        <label className="form-control gap-2">
          <span className="label-text font-medium">{t("prayerDrawer.contentLabel")}</span>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={t("prayerDrawer.contentPlaceholder")} className="textarea textarea-bordered min-h-40 w-full" />
        </label>
      </div>
    </div>
  );
}
