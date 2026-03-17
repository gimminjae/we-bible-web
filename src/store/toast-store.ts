"use client";

import { create } from "zustand";

import { createId } from "@/lib/date";

export type ToastRecord = {
  id: string;
  message: string;
};

type ToastStore = {
  toasts: ToastRecord[];
  showToast: (message: string) => void;
  removeToast: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (message) =>
    set((state) => ({
      toasts: [...state.toasts, { id: createId(), message }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
