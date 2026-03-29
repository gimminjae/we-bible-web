"use client";

import { useMemo, useState } from "react";

import { Check, X } from "@/components/icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { ChurchPrayer } from "@/lib/church";
import { useI18n } from "@/utils/i18n";

export type ChurchPrayerAudienceOption = {
  value: string;
  label: string;
};

type ChurchPrayerSheetMode = "create" | "edit" | "append";

type ChurchPrayerSheetProps = {
  open: boolean;
  mode: ChurchPrayerSheetMode;
  onClose: () => void;
  onSubmit: (input: {
    teamId: string | null;
    requester: string;
    target: string;
    content: string;
  }) => void | Promise<void>;
  isSubmitting?: boolean;
  prayer?: ChurchPrayer | null;
  audienceOptions?: ChurchPrayerAudienceOption[];
  initialAudienceValue?: string;
};

function getPrayerSheetTitle(mode: ChurchPrayerSheetMode, t: (key: string) => string) {
  if (mode === "edit") return t("church.editPrayerTitle");
  if (mode === "append") return t("church.appendPrayerContentTitle");
  return t("church.createPrayerTitle");
}

export function ChurchPrayerSheet({
  open,
  mode,
  onClose,
  onSubmit,
  isSubmitting = false,
  prayer = null,
  audienceOptions = [],
  initialAudienceValue = "",
}: ChurchPrayerSheetProps) {
  const { t } = useI18n();
  const [audienceValue, setAudienceValue] = useState(initialAudienceValue);
  const [requester, setRequester] = useState(prayer?.requester ?? "");
  const [target, setTarget] = useState(prayer?.target ?? "");
  const [content, setContent] = useState("");

  const saveDisabled = useMemo(() => {
    if (isSubmitting) return true;
    if (mode === "append") return !content.trim();
    if (mode === "create") return !content.trim();
    return false;
  }, [content, isSubmitting, mode]);

  const showAudienceSelect = mode === "create" && audienceOptions.length > 1;
  const showMetaFields = mode !== "append";

  return (
    <BottomSheet open={open} onClose={onClose} title={getPrayerSheetTitle(mode, t)}>
      <div className="space-y-4 pb-4">
        {showAudienceSelect ? (
          <label className="form-control gap-2">
            <span className="label-text font-medium">{t("church.prayerAudienceLabel")}</span>
            <select
              value={audienceValue}
              onChange={(event) => setAudienceValue(event.target.value)}
              className="select select-bordered w-full"
            >
              {audienceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {mode !== "create" && prayer ? (
          <div className="rounded-2xl border border-base-300 bg-base-200 px-4 py-3 text-sm text-base-content/70">
            <p className="font-medium text-base-content">
              {prayer.scope === "team"
                ? t("church.teamPrayerScopeLabel").replace("{team}", prayer.teamName ?? "-")
                : t("church.churchPrayerScopeLabel")}
            </p>
            <p className="mt-1">{t("church.prayerCreatedBy").replace("{name}", prayer.createdByName)}</p>
          </div>
        ) : null}

        {showMetaFields ? (
          <>
            <label className="form-control gap-2">
              <span className="label-text font-medium">{t("prayerDrawer.requesterLabel")}</span>
              <input
                value={requester}
                onChange={(event) => setRequester(event.target.value)}
                placeholder={t("prayerDrawer.requesterPlaceholder")}
                className="input input-bordered w-full"
              />
            </label>

            <label className="form-control gap-2">
              <span className="label-text font-medium">{t("prayerDrawer.targetLabel")}</span>
              <input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder={t("prayerDrawer.targetPlaceholder")}
                className="input input-bordered w-full"
              />
            </label>
          </>
        ) : null}

        <label className="form-control gap-2">
          <span className="label-text font-medium">
            {mode === "edit" ? t("church.prayerNewContentLabel") : t("prayerDrawer.contentLabel")}
          </span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={
              mode === "edit"
                ? t("church.prayerNewContentPlaceholder")
                : t("prayerDrawer.contentPlaceholder")
            }
            className="textarea textarea-bordered min-h-40 w-full"
          />
        </label>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
            <X className="size-4" />
            {t("prayerDrawer.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saveDisabled}
            onClick={() =>
              void onSubmit({
                teamId: audienceValue || null,
                requester,
                target,
                content,
              })
            }
          >
            <Check className="size-4" />
            {t("prayerDrawer.save")}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
