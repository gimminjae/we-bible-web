"use client";

import { BookHeart, BookOpenCheck, ChevronRight, NotebookText, Sparkles } from "lucide-react";
import Link from "next/link";

import { BibleGrass } from "@/components/mypage/bible-grass";
import { useI18n } from "@/utils/i18n";

function MenuCard({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-[1.75rem] border border-base-300 bg-base-100 px-5 py-6 transition hover:bg-base-200/60">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-base-200">{icon}</div>
        <span className="font-medium">{title}</span>
      </div>
      <ChevronRight className="size-5 text-base-content/45" />
    </Link>
  );
}

export default function MyPageScreen() {
  const { t } = useI18n();

  return (
    <div className="space-y-5 px-4 py-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.28em] text-base-content/45">Dashboard</p>
        <h1 className="text-3xl font-semibold">{t("mypage.title")}</h1>
      </div>

      <BibleGrass />

      <div className="grid gap-3">
        <MenuCard href="/favorites" title={t("mypage.favoritesMenu")} icon={<BookHeart className="size-5 text-pink-500" />} />
        <MenuCard href="/memos" title={t("mypage.memosMenu")} icon={<NotebookText className="size-5 text-amber-600" />} />
        <MenuCard href="/prayers" title={t("mypage.prayersMenu")} icon={<Sparkles className="size-5 text-indigo-500" />} />
        <MenuCard href="/plans" title={t("mypage.plansMenu")} icon={<BookOpenCheck className="size-5 text-emerald-600" />} />
      </div>
    </div>
  );
}
