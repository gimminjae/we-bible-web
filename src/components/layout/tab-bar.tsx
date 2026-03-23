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
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0px)] sm:bottom-6 sm:px-4">
      <div className="w-full max-w-[28rem] border-t border-base-300 bg-base-100/95 px-3 py-3 backdrop-blur sm:rounded-[1.75rem] sm:border sm:shadow-2xl sm:shadow-stone-950/10">
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
      </div>
    </nav>
  );
}
