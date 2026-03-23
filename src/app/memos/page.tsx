"use client";

import { Copy, Plus } from "lucide-react";
import Link from "next/link";

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

export default function MemosPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const memos = useAppStore((state) => state.memos);
  const addMemo = useAppStore((state) => state.addMemo);
  const memoDrawer = useDrawer();

  useHeader(
    () => ({
      title: t("mypage.memosTitle"),
      eyebrow: t("common.back"),
      showBack: true,
      actions: (
        <button type="button" className="btn btn-sm btn-primary" onClick={memoDrawer.open}>
          <Plus className="size-4" />
          {t("mypage.writeMemo")}
        </button>
      ),
    }),
    [t],
  );

  return (
    <div className="min-h-screen bg-base-100">
      <div className="space-y-3 px-4 py-5">
        {memos.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 px-5 py-10 text-center text-sm text-base-content/55">
            {t("mypage.emptyMemos")}
          </div>
        ) : (
          memos.map((memo) => (
            <Link key={memo.id} href={`/memos/${memo.id}`} className="block rounded-[1.75rem] border border-base-300 bg-base-100 p-4 shadow-sm transition hover:bg-base-200/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{memo.title || memo.verseText || t("mypage.untitled")}</p>
                  <p className="mt-3 text-xs text-base-content/45">{formatShortDateTime(memo.createdAt)}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost btn-circle border border-base-300"
                  onClick={async (event) => {
                    event.preventDefault();
                    await copyText(buildMemoCopyText(memo.title, memo.verseText, memo.content, t("mypage.untitled")));
                    showToast(t("toast.copySuccess"));
                  }}
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </Link>
          ))
        )}
      </div>

      <MemoSheet
        key={memoDrawer.version}
        open={memoDrawer.isOpen}
        onClose={memoDrawer.close}
        initialVerseText=""
        onSave={(title, content) => {
          addMemo({ title, content, verseText: "" });
        }}
      />
    </div>
  );
}
