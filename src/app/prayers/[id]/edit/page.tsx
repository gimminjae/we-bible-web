"use client";

import { Plus, Trash2 } from "lucide-react";
import { notFound, useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useHeader } from "@/hooks/use-header";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { useI18n } from "@/utils/i18n";

type ContentItem = {
  id?: string;
  content: string;
};

export default function EditPrayerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const prayer = useAppStore((state) => state.prayers.find((item) => item.id === params.id));
  const updatePrayer = useAppStore((state) => state.updatePrayer);
  const deletePrayerContent = useAppStore((state) => state.deletePrayerContent);
  const updatePrayerContent = useAppStore((state) => state.updatePrayerContent);
  const addPrayerContent = useAppStore((state) => state.addPrayerContent);
  const [requester, setRequester] = useState(prayer?.requester ?? "");
  const [target, setTarget] = useState(prayer?.target ?? "");
  const [contents, setContents] = useState<ContentItem[]>(
    () => prayer?.contents.map((item) => ({ id: item.id, content: item.content })) ?? [],
  );
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const canSave = useMemo(() => contents.some((item) => item.content.trim()), [contents]);

  useHeader(
    () => ({
      title: t("prayerDrawer.editTitle"),
      eyebrow: t("common.back"),
      showBack: true,
      actions: prayer ? (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={!canSave}
          onClick={() => {
            updatePrayer(prayer.id, requester, target);
            deletedIds.forEach((id) => deletePrayerContent(prayer.id, id));
            contents.forEach((item) => {
              if (item.id) updatePrayerContent(prayer.id, item.id, item.content);
              else if (item.content.trim()) addPrayerContent(prayer.id, item.content);
            });
            showToast(t("toast.prayerUpdated"));
            router.back();
          }}
        >
          {t("prayerDrawer.save")}
        </button>
      ) : null,
    }),
    [addPrayerContent, canSave, contents, deletePrayerContent, deletedIds, prayer, requester, router, showToast, t, target, updatePrayer, updatePrayerContent],
  );

  if (!prayer) {
    notFound();
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="label-text font-medium">{t("prayerDrawer.contentLabel")}</span>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setContents((previous) => [...previous, { content: "" }])}>
              <Plus className="size-4" />
              {t("prayerDrawer.addContent")}
            </button>
          </div>

          {contents.map((item, index) => (
            <div key={item.id ?? `new-${index}`} className="rounded-[1.5rem] border border-base-300 bg-base-100 p-4 shadow-sm">
              <div className="flex gap-3">
                <textarea
                  value={item.content}
                  onChange={(event) =>
                    setContents((previous) => previous.map((content, contentIndex) => (contentIndex === index ? { ...content, content: event.target.value } : content)))
                  }
                  placeholder={t("prayerDrawer.contentPlaceholder")}
                  className="textarea textarea-bordered min-h-28 flex-1"
                />
                <button
                  type="button"
                  className="btn btn-sm btn-ghost btn-circle border border-base-300"
                  onClick={() => {
                    if (item.id) setDeletedIds((previous) => [...previous, item.id!]);
                    setContents((previous) => previous.filter((_, contentIndex) => contentIndex !== index));
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
