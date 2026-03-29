"use client";

import { ToastContainer } from "react-toastify";

import { useAppSettings } from "@/contexts/app-settings";

export function ToastViewport() {
  const { theme } = useAppSettings();

  return (
    <ToastContainer
      position="top-center"
      autoClose={2200}
      pauseOnHover
      draggable
      theme={theme === "night" ? "dark" : "light"}
    />
  );
}
