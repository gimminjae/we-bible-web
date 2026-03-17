"use client";

import { useState } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useI18n } from "@/utils/i18n";

type MemoSheetProps = {
  open: boolean;
  onClose: () => void;
  initialVerseText: string;
  initialTitle?: string;
  initialContent?: string;
  editMode?: boolean;
  onSave: (title: string, content: string) => void;
};

export function MemoSheet({
  open,
  onClose,
  initialVerseText,
  initialTitle = "",
  initialContent = "",
  editMode = false,
  onSave,
}: MemoSheetProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  const handleSave = () => {
    onSave(title.trim(), content.trim());
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={editMode ? t("memoDrawer.editTitle") : t("memoDrawer.title")}>
      <div className="space-y-4 pb-4">
        <label className="form-control gap-2">
          <span className="label-text font-medium">{t("memoDrawer.titleLabel")}</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("memoDrawer.titlePlaceholder")}
            className="input input-bordered w-full"
          />
        </label>

        {initialVerseText ? (
          <div className="space-y-2">
            <span className="label-text font-medium">{t("memoDrawer.verseTextLabel")}</span>
            <div className="verse-copy rounded-2xl border border-base-300 bg-base-200 px-4 py-3 text-sm leading-6">
              {initialVerseText}
            </div>
          </div>
        ) : null}

        <label className="form-control gap-2">
          <span className="label-text font-medium">{t("memoDrawer.contentLabel")}</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t("memoDrawer.contentPlaceholder")}
            className="textarea textarea-bordered min-h-48 w-full"
          />
        </label>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t("memoDrawer.cancel")}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            {t("memoDrawer.save")}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
