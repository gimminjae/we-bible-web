"use client";

import { Copy, Pencil, Trash2 } from "lucide-react";
import { notFound, useParams, useRouter } from "next/navigation";
import { useMemo } from "react";

import { MemoSheet } from "@/components/memos/memo-sheet";
import { useDrawer } from "@/hooks/use-drawer";
import { useHeader } from "@/hooks/use-header";
import { copyText } from "@/lib/clipboard";
import { formatShortDateTime } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { useI18n } from "@/utils/i18n";

function buildMemoCopyText(title: string, verseText: string, content: string, untitled: string) {
  return [title || untitled, verseText || "", content || ""].filter(Boolean).join("\n\n");
}

export default function MemoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const memo = useAppStore((state) => state.memos.find((item) => item.id === params.id));
  const updateMemo = useAppStore((state) => state.updateMemo);
  const deleteMemo = useAppStore((state) => state.deleteMemo);
  const editDrawer = useDrawer();

  const copyTextValue = useMemo(() => {
    if (!memo) return "";
    return buildMemoCopyText(memo.title, memo.verseText, memo.content, t("mypage.untitled"));
  }, [memo, t]);

  useHeader(
    () => ({
      title: t("mypage.memoDetailTitle"),
      eyebrow: t("common.back"),
      showBack: true,
      actions: (
        <>
          <button
            type="button"
            className="btn btn-sm btn-ghost border border-base-300"
            onClick={async () => {
              await copyText(copyTextValue);
              showToast(t("toast.copySuccess"));
            }}
          >
            <Copy className="size-4" />
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={editDrawer.open}>
            <Pencil className="size-4" />
            {t("mypage.editMemo")}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-error"
            onClick={() => {
              if (!memo) return;
              deleteMemo(memo.id);
              showToast(t("toast.memoDeleted"));
              router.back();
            }}
          >
            <Trash2 className="size-4" />
            {t("mypage.deleteMemo")}
          </button>
        </>
      ),
    }),
    [copyTextValue, deleteMemo, memo, router, showToast, t],
  );

  if (!memo) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="space-y-3 px-4 py-5">
        <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{memo.title || t("mypage.untitled")}</h2>
          <p className="mt-2 text-xs text-base-content/45">{formatShortDateTime(memo.createdAt)}</p>
        </section>

        {memo.verseText ? (
          <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
            <p className="text-sm font-medium text-base-content/50">{t("mypage.verseText")}</p>
            <div className="verse-copy mt-3 text-sm leading-7">{memo.verseText}</div>
          </section>
        ) : null}

        <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <p className="text-sm font-medium text-base-content/50">{t("mypage.content")}</p>
          <div className="verse-copy mt-3 text-sm leading-7">{memo.content || t("mypage.noContent")}</div>
        </section>
      </div>

      <MemoSheet
        key={editDrawer.version}
        open={editDrawer.isOpen}
        onClose={editDrawer.close}
        editMode
        initialVerseText={memo.verseText}
        initialTitle={memo.title}
        initialContent={memo.content}
        onSave={(title, content) => {
          updateMemo(memo.id, title, content);
          showToast(t("toast.memoUpdated"));
        }}
      />
    </div>
  );
}
