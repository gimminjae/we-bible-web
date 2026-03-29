"use client";

import Link from "next/link";

import { House } from "@/components/icons";
import { useHeader } from "@/hooks/use-header";

export default function NotFound() {
  useHeader(
    () => ({
      title: "Page not found",
      eyebrow: "404",
      size: "hero",
    }),
    [],
  );

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-6">
      <div className="w-full max-w-md rounded-[2rem] border border-base-300 bg-base-100 px-8 py-12 text-center shadow-2xl shadow-stone-950/10">
        <p className="text-xs uppercase tracking-[0.3em] text-base-content/40">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-base-content/60">The requested route does not exist in we-bible-web.</p>
        <Link href="/" className="btn btn-primary mt-6">
          <House className="size-4" />
          Back to Bible
        </Link>
      </div>
    </div>
  );
}
