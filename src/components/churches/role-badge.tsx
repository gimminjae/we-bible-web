"use client";

import type { ChurchRole } from "@/lib/church";
import { cn } from "@/utils/cn";
import { useI18n } from "@/utils/i18n";

export function ChurchRoleBadge({ role }: { role: ChurchRole }) {
  const { t } = useI18n();

  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        role === "super_admin" && "bg-amber-100 text-amber-700",
        role === "deputy_admin" && "bg-sky-100 text-sky-700",
        role === "member" && "bg-base-200 text-base-content/70",
      )}
    >
      {t(`church.role.${role}`)}
    </span>
  );
}
