"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useI18n } from "@/utils/i18n";

type PageHeaderProps = {
  title: string;
  actions?: ReactNode;
};

export function PageHeader({ title, actions }: PageHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-base-300 bg-base-100/95 px-4 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={() => router.back()}>
          <ChevronLeft className="size-5" />
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-base-content/45">{t("common.back")}</p>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
