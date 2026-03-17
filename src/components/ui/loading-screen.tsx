"use client";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-[26rem] rounded-[2rem] border border-base-300 bg-base-100 px-8 py-12 text-center shadow-2xl shadow-stone-950/10">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="mt-4 text-sm text-base-content/70">Preparing we-bible-web...</p>
      </div>
    </div>
  );
}
