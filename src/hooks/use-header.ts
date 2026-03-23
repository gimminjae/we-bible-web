"use client";

import { useLayoutEffect, type DependencyList } from "react";

import { type HeaderConfig, useHeaderContext } from "@/contexts/header-context";

export function useHeader(factory: () => HeaderConfig, deps: DependencyList = []) {
  const { setHeader, resetHeader } = useHeaderContext();

  useLayoutEffect(() => {
    setHeader(factory());
    return () => {
      resetHeader();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader, resetHeader, ...deps]);
}
