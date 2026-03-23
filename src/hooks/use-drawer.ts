"use client";

import { useCallback, useState } from "react";

export function useDrawer(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [version, setVersion] = useState(0);

  const open = useCallback(() => {
    setVersion((previous) => previous + 1);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((previous) => !previous);
  }, []);

  return {
    isOpen,
    version,
    setIsOpen,
    open,
    close,
    toggle,
  };
}
