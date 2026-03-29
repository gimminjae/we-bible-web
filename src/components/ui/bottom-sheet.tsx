"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { X } from "@/components/icons";
import { cn } from "@/utils/cn";

const SHEET_TRANSITION_MS = 260;

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  onAfterClose?: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function BottomSheet({ open, onClose, onAfterClose, title, children, className }: BottomSheetProps) {
  useEffect(() => {
    if (open || !onAfterClose) return undefined;
    const timeout = window.setTimeout(() => {
      onAfterClose();
    }, SHEET_TRANSITION_MS);
    return () => window.clearTimeout(timeout);
  }, [onAfterClose, open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return undefined;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-50", open ? "" : "pointer-events-none")} aria-hidden={!open}>
      <button
        type="button"
        aria-label="Close"
        className={cn("absolute inset-0 z-0 bg-black/45 transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <div
        className={cn(
          "pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex max-h-[88vh] flex-col overflow-hidden rounded-t-[2rem] bg-base-100 shadow-2xl will-change-transform transition-[transform,opacity] duration-[260ms] ease-out",
          open ? "translate-y-0 opacity-100" : "translate-y-full opacity-95",
          className,
        )}
      >
        <div className="shrink-0 flex items-center justify-between border-b border-base-300 px-5 py-4">
          <div className="h-1.5 w-14 rounded-full bg-base-300" />
          {title ? <h2 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold">{title}</h2> : null}
          <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4" style={{ WebkitOverflowScrolling: "touch" }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
