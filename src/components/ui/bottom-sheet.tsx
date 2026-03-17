"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/utils/cn";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  const element = useMemo(() => {
    if (typeof document === "undefined" || !open) return null;

    return (
      <div className="fixed inset-0 z-50">
        <button type="button" aria-label="Close" className="absolute inset-0 bg-black/45" onClick={onClose} />
        <div className={cn("absolute inset-x-0 bottom-0 max-h-[88vh] rounded-t-[2rem] bg-base-100 shadow-2xl", className)}>
          <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
            <div className="h-1.5 w-14 rounded-full bg-base-300" />
            {title ? <h2 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold">{title}</h2> : null}
            <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
              <X className="size-4" />
            </button>
          </div>
          <div className="app-scrollbar overflow-y-auto px-5 py-4">{children}</div>
        </div>
      </div>
    );
  }, [className, children, onClose, open, title]);

  if (!element) return null;
  return createPortal(element, document.body);
}
