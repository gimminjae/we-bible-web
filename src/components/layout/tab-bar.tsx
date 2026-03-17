"use client";

import { BookOpenText, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/utils/cn";
import { useI18n } from "@/utils/i18n";

const items = [
  { href: "/", key: "tabs.bible", icon: BookOpenText },
  { href: "/mypage", key: "tabs.mypage", icon: UserRound },
  { href: "/settings", key: "tabs.settings", icon: Settings },
];

export function TabBar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="absolute inset-x-0 bottom-0 border-t border-base-300 bg-base-100/95 px-3 py-3 backdrop-blur">
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition",
                active ? "bg-primary text-primary-content shadow-lg shadow-primary/20" : "text-base-content/60 hover:bg-base-200",
              )}
            >
              <Icon className="size-5" />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
