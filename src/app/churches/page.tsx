"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Building2, Loader2, Plus, Search } from "@/components/icons";
import { ChurchRoleBadge } from "@/components/churches/role-badge";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/contexts/auth-context";
import { useChurchActions, useChurchSearch, useMyChurches } from "@/hooks/use-churches";
import { useHeader } from "@/hooks/use-header";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/utils/i18n";

export default function ChurchesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { currentUser, isConfigured } = useAuth();
  const { churches: myChurches, isLoading, error } = useMyChurches();
  const { createChurch, requestJoin } = useChurchActions();
  const [newChurchName, setNewChurchName] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [submittingJoinChurchId, setSubmittingJoinChurchId] = useState<string | null>(null);
  const { churches: searchResults, isLoading: isSearching, error: searchError } = useChurchSearch(searchKeyword);

  useHeader(
    () => ({
      title: t("church.title"),
      eyebrow: "Community",
      size: "hero",
    }),
    [t],
  );

  if (error) {
    return <LoadingScreen message={error.message} />;
  }

  if (isLoading) {
    return <LoadingScreen message="Loading churches..." />;
  }

  const canUseChurchFeature = Boolean(isConfigured && currentUser);

  return (
    <div className="min-h-screen bg-base-100">
      <div className="space-y-5 px-4 py-5">
        {!isConfigured ? (
          <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 text-sm text-base-content/65 shadow-sm">
            {t("church.authNotConfigured")}
          </section>
        ) : null}

        {isConfigured && !currentUser ? (
          <section className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 p-5 text-sm text-base-content/65 shadow-sm">
            {t("church.loginRequired")}
          </section>
        ) : null}

        {canUseChurchFeature ? (
          <section className="space-y-3 rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
            <div>
              <p className="text-sm font-medium text-base-content/55">{t("church.createTitle")}</p>
              <p className="mt-1 text-sm text-base-content/60">{t("church.createDescription")}</p>
            </div>

            <div className="flex gap-2">
              <input
                value={newChurchName}
                onChange={(event) => setNewChurchName(event.target.value)}
                placeholder={t("church.createPlaceholder")}
                className="input input-bordered flex-1"
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSubmittingCreate || !newChurchName.trim()}
                onClick={async () => {
                  setIsSubmittingCreate(true);
                  try {
                    const churchId = await createChurch(newChurchName);
                    showToast(t("toast.churchCreated"));
                    setNewChurchName("");
                    router.push(`/churches/${churchId}`);
                  } catch (createError) {
                    showToast(createError instanceof Error ? createError.message : t("church.createFailed"));
                  } finally {
                    setIsSubmittingCreate(false);
                  }
                }}
              >
                {isSubmittingCreate ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {t("church.createButton")}
              </button>
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("church.myChurches")}</h2>
            <span className="text-sm text-base-content/55">{myChurches.length}</span>
          </div>

          {myChurches.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 px-5 py-10 text-center text-sm text-base-content/55">
              {t("church.emptyMyChurches")}
            </div>
          ) : (
            myChurches.map((church) => (
              <Link
                key={church.id}
                href={`/churches/${church.id}`}
                className="block rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm transition hover:bg-base-200/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{church.name}</p>
                    <p className="mt-2 text-sm text-base-content/60">
                      {t("church.memberCount").replace("{count}", String(church.memberCount))}
                    </p>
                    {church.myTeamName ? (
                      <p className="mt-1 text-sm text-base-content/60">
                        {t("church.teamLabel")} {church.myTeamName}
                      </p>
                    ) : null}
                  </div>
                  {church.myRole ? <ChurchRoleBadge role={church.myRole} /> : null}
                </div>
              </Link>
            ))
          )}
        </section>

        <section className="space-y-3 rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div>
            <p className="text-sm font-medium text-base-content/55">{t("church.searchTitle")}</p>
            <p className="mt-1 text-sm text-base-content/60">{t("church.searchDescription")}</p>
          </div>

          <label className="input input-bordered flex items-center gap-2">
            <Search className="size-4 text-base-content/45" />
            <input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder={t("church.searchPlaceholder")}
              className="grow"
            />
          </label>

          {searchError ? (
            <p className="text-sm text-error">{searchError.message}</p>
          ) : null}

          {!searchKeyword.trim() ? (
            <p className="text-sm text-base-content/55">{t("church.searchHint")}</p>
          ) : isSearching ? (
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <Loader2 className="size-4 animate-spin" />
              {t("church.searching")}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 px-4 py-8 text-center text-sm text-base-content/55">
              {t("church.noSearchResults")}
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((church) => (
                <div key={church.id} className="rounded-[1.5rem] border border-base-300 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{church.name}</p>
                      <p className="mt-1 text-sm text-base-content/60">
                        {t("church.memberCount").replace("{count}", String(church.memberCount))}
                      </p>
                    </div>

                    {church.isMember ? (
                      <Link href={`/churches/${church.id}`} className="btn btn-sm btn-primary">
                        <Building2 className="size-4" />
                        {t("church.enter")}
                      </Link>
                    ) : church.pendingRequestStatus === "pending" ? (
                      <button type="button" className="btn btn-sm btn-outline" disabled>
                        {t("church.requestPending")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={submittingJoinChurchId === church.id || !canUseChurchFeature}
                        onClick={async () => {
                          setSubmittingJoinChurchId(church.id);
                          try {
                            await requestJoin(church.id);
                            showToast(t("toast.joinRequestSent"));
                          } catch (joinError) {
                            showToast(joinError instanceof Error ? joinError.message : t("church.joinRequestFailed"));
                          } finally {
                            setSubmittingJoinChurchId(null);
                          }
                        }}
                      >
                        {submittingJoinChurchId === church.id ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                        {t("church.requestJoin")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
