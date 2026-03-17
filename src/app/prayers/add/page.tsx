"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { useI18n } from "@/utils/i18n";

export default function AddPrayerPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const addPrayer = useAppStore((state) => state.addPrayer);
  const [requester, setRequester] = useState("");
  const [target, setTarget] = useState("");
  const [content, setContent] = useState("");

  return (
    <div className="min-h-screen bg-base-100">
      <PageHeader
        title={t("prayerDrawer.addTitle")}
        actions={
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
            {t("prayerDrawer.save")}
          </button>
        }
      />

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
