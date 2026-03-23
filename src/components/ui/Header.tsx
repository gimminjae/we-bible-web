"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { DEFAULT_HEADER_HEIGHT, useHeaderContext } from "@/contexts/header-context";
import { cn } from "@/utils/cn";

export function Header() {
  const router = useRouter();
  const { header, setHeaderHeight } = useHeaderContext();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!headerRef.current) {
      setHeaderHeight(DEFAULT_HEADER_HEIGHT);
      return undefined;
    }

    const element = headerRef.current;
    const updateHeight = () => {
      setHeaderHeight(Math.ceil(element.getBoundingClientRect().height));
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [header, setHeaderHeight]);

  if (!header) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-40 flex justify-center px-0 sm:px-4 sm:pt-6">
      <header
        ref={headerRef}
        className={cn(
          "w-full max-w-[28rem] border-b border-base-300 bg-base-100/95 backdrop-blur sm:rounded-t-[2rem] sm:border sm:shadow-lg sm:shadow-stone-950/5",
          header.className,
        )}
      >
        {header.content ? (
          <div className={cn("px-4 py-4", header.contentClassName)}>{header.content}</div>
        ) : (
          <div
            className={cn(
              "flex items-start justify-between gap-3 px-4 py-4",
              header.size === "hero" ? "min-h-[5.75rem]" : "min-h-[4.75rem]",
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {header.showBack ? (
                <button type="button" className="btn btn-ghost btn-sm btn-circle shrink-0" onClick={() => router.back()}>
                  <ChevronLeft className="size-5" />
                </button>
              ) : null}

              <div className="min-w-0">
                {header.eyebrow ? (
                  <p className="text-xs uppercase tracking-[0.25em] text-base-content/45">{header.eyebrow}</p>
                ) : null}
                {header.title ? (
                  <h1 className={cn("truncate font-semibold", header.size === "hero" ? "text-3xl" : "text-lg")}>
                    {header.title}
                  </h1>
                ) : null}
              </div>
            </div>

            {header.actions ? <div className="flex flex-wrap items-center justify-end gap-2">{header.actions}</div> : null}
          </div>
        )}
      </header>
    </div>
  );
}
