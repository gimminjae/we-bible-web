"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BookOpenCheck, Building2, Check, Heart, Loader2, LogOut, Pencil, Plus, Shield, ShieldOff, Trash2, UserMinus, Users, X } from "@/components/icons";
import { ChurchPrayerSheet } from "@/components/churches/church-prayer-sheet";
import { ChurchRoleBadge } from "@/components/churches/role-badge";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/contexts/auth-context";
import { useChurchActions, useChurchDetail } from "@/hooks/use-churches";
import { useDrawer } from "@/hooks/use-drawer";
import { useHeader } from "@/hooks/use-header";
import { useToast } from "@/hooks/use-toast";
import { formatShortDateTime } from "@/lib/date";
import { buildPrayerLabel } from "@/lib/prayer";
import type { ChurchPrayer } from "@/lib/church";
import { useI18n } from "@/utils/i18n";

export default function ChurchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { dataUserId } = useAuth();
  const { churchDetail, isLoading, error } = useChurchDetail(params.id);
  const {
    approveJoinRequest,
    rejectJoinRequest,
    updateMemberRole,
    updateMemberTeam,
    updateTeamLeader,
    removeMember,
    leaveChurch,
    createTeam,
    createChurchPrayer,
    updateChurchPrayer,
    deleteChurchPrayer,
    addChurchPrayerContent,
    deleteChurchPrayerContent,
  } = useChurchActions();
  const [activeTab, setActiveTab] = useState<"members" | "plans" | "prayers" | "teams">("members");
  const [creatingTeamName, setCreatingTeamName] = useState("");
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [selectedRequestTeamIds, setSelectedRequestTeamIds] = useState<Record<string, string>>({});
  const [selectedMemberTeamIds, setSelectedMemberTeamIds] = useState<Record<string, string>>({});
  const [selectedTeamLeaderIds, setSelectedTeamLeaderIds] = useState<Record<string, string>>({});
  const [expandedPrayerId, setExpandedPrayerId] = useState<string | null>(null);
  const [selectedPrayer, setSelectedPrayer] = useState<ChurchPrayer | null>(null);
  const createPrayerDrawer = useDrawer();
  const editPrayerDrawer = useDrawer();
  const appendPrayerDrawer = useDrawer();

  const prayerAudienceOptions = useMemo(() => {
    if (!churchDetail?.church.myRole) return [];

    const options = [
      {
        value: "",
        label: t("church.churchPrayerAudienceOption"),
      },
    ];

    if (churchDetail.church.isSuperAdmin || churchDetail.church.isDeputyAdmin) {
      return [
        ...options,
        ...churchDetail.teams.map((team) => ({
          value: team.id,
          label: t("church.teamPrayerAudienceOption").replace("{team}", team.name),
        })),
      ];
    }

    if (churchDetail.church.myTeamId && churchDetail.church.myTeamName) {
      return [
        ...options,
        {
          value: churchDetail.church.myTeamId,
          label: t("church.teamPrayerAudienceOption").replace("{team}", churchDetail.church.myTeamName),
        },
      ];
    }

    return options;
  }, [churchDetail, t]);

  const churchWidePrayers = useMemo(
    () => churchDetail?.prayers.filter((prayer) => prayer.teamId == null) ?? [],
    [churchDetail],
  );

  const teamPrayerGroups = useMemo(() => {
    if (!churchDetail) return [];

    const groupMap = new Map<string, { teamId: string; teamName: string; prayers: ChurchPrayer[] }>();

    for (const prayer of churchDetail.prayers) {
      if (!prayer.teamId || !prayer.teamName) continue;

      const existing = groupMap.get(prayer.teamId);
      if (existing) {
        existing.prayers.push(prayer);
      } else {
        groupMap.set(prayer.teamId, {
          teamId: prayer.teamId,
          teamName: prayer.teamName,
          prayers: [prayer],
        });
      }
    }

    return [...groupMap.values()].sort((left, right) =>
      left.teamName.localeCompare(right.teamName, "ko"),
    );
  }, [churchDetail]);

  const activeTabTitle = useMemo(() => {
    if (activeTab === "members") return t("church.tabs.members");
    if (activeTab === "plans") return t("church.tabs.plans");
    if (activeTab === "prayers") return t("church.tabs.prayers");
    return t("church.tabs.teams");
  }, [activeTab, t]);

  useHeader(
    () => ({
      title: churchDetail?.church.name ?? t("church.detailTitle"),
      eyebrow: t("common.back"),
      showBack: true,
    }),
    [churchDetail?.church.name, t],
  );

  if (error) {
    if (error.message === "CHURCH_NOT_FOUND") {
      notFound();
    }

    return <LoadingScreen message={error.message} />;
  }

  if (isLoading) {
    return <LoadingScreen message="Loading church..." />;
  }

  if (!churchDetail) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="space-y-4 px-4 py-5">
        <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold">{churchDetail.church.name}</p>
              <p className="mt-2 text-sm text-base-content/60">
                {t("church.memberCount").replace("{count}", String(churchDetail.church.memberCount))}
              </p>
              {churchDetail.church.myTeamName ? (
                <p className="mt-1 text-sm text-base-content/60">
                  {t("church.teamLabel")} {churchDetail.church.myTeamName}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col items-end gap-2">
              {churchDetail.church.myRole ? <ChurchRoleBadge role={churchDetail.church.myRole} /> : null}
              {dataUserId && churchDetail.church.myRole && churchDetail.church.myRole !== "super_admin" ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={processingKey === "leave-church"}
                  onClick={async () => {
                    if (!window.confirm(t("church.leaveConfirm"))) return;
                    setProcessingKey("leave-church");
                    try {
                      await leaveChurch(churchDetail.church.id);
                      showToast(t("toast.churchLeft"));
                      router.replace("/churches");
                    } catch (leaveError) {
                      showToast(leaveError instanceof Error ? leaveError.message : t("church.leaveFailed"));
                    } finally {
                      setProcessingKey(null);
                    }
                  }}
                >
                  {processingKey === "leave-church" ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  {t("church.leave")}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <div className="tabs tabs-boxed bg-base-200">
          <button
            type="button"
            aria-label={t("church.tabs.members")}
            title={t("church.tabs.members")}
            className={`tab flex-1 ${activeTab === "members" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            <Users className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("church.tabs.plans")}
            title={t("church.tabs.plans")}
            className={`tab flex-1 ${activeTab === "plans" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("plans")}
          >
            <BookOpenCheck className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("church.tabs.prayers")}
            title={t("church.tabs.prayers")}
            className={`tab flex-1 ${activeTab === "prayers" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("prayers")}
          >
            <Heart className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("church.tabs.teams")}
            title={t("church.tabs.teams")}
            className={`tab flex-1 ${activeTab === "teams" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("teams")}
          >
            <Building2 className="size-4" />
          </button>
        </div>

        <div className="px-1">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-base-content">
            {activeTabTitle}
          </h2>
        </div>

        {activeTab === "members" ? (
          <div className="space-y-4">
            {churchDetail.church.canManageMembers && churchDetail.pendingJoinRequests.length > 0 ? (
              <section className="space-y-3 rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <h2 className="font-semibold">{t("church.pendingRequests")}</h2>
                </div>

                {churchDetail.pendingJoinRequests.map((request) => (
                  <div key={request.id} className="rounded-[1.5rem] border border-base-300 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{request.requester.displayName}</p>
                        <p className="mt-1 text-sm text-base-content/60">
                          {request.requester.email ?? request.requester.userId}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          className="select select-bordered select-sm"
                          value={selectedRequestTeamIds[request.id] ?? ""}
                          onChange={(event) =>
                            setSelectedRequestTeamIds((previous) => ({
                              ...previous,
                              [request.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">{t("church.noTeam")}</option>
                          {churchDetail.teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={processingKey === `approve-${request.id}`}
                          onClick={async () => {
                            setProcessingKey(`approve-${request.id}`);
                            try {
                              await approveJoinRequest({
                                requestId: request.id,
                                churchId: churchDetail.church.id,
                                requesterUserId: request.requesterUserId,
                                teamId: selectedRequestTeamIds[request.id] || null,
                              });
                              showToast(t("toast.joinRequestApproved"));
                            } catch (approveError) {
                              showToast(approveError instanceof Error ? approveError.message : t("church.approveFailed"));
                            } finally {
                              setProcessingKey(null);
                            }
                          }}
                        >
                          {processingKey === `approve-${request.id}` ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                          {t("church.approve")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          disabled={processingKey === `reject-${request.id}`}
                          onClick={async () => {
                            setProcessingKey(`reject-${request.id}`);
                            try {
                              await rejectJoinRequest({
                                requestId: request.id,
                                churchId: churchDetail.church.id,
                              });
                              showToast(t("toast.joinRequestRejected"));
                            } catch (rejectError) {
                              showToast(rejectError instanceof Error ? rejectError.message : t("church.rejectFailed"));
                            } finally {
                              setProcessingKey(null);
                            }
                          }}
                        >
                          {processingKey === `reject-${request.id}` ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                          {t("church.reject")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            ) : null}

            <section className="space-y-3">
              {churchDetail.members.map((member) => {
                const teamSelectValue = selectedMemberTeamIds[member.userId] ?? member.teamId ?? "";
                const canToggleDeputy =
                  churchDetail.church.isSuperAdmin &&
                  member.userId !== churchDetail.church.superAdminUserId &&
                  member.userId !== churchDetail.church.createdByUserId;
                const canManageMemberTeam =
                  churchDetail.church.isSuperAdmin ||
                  (churchDetail.church.isDeputyAdmin && member.role === "member");
                const canRemoveMember =
                  member.userId !== dataUserId &&
                  (churchDetail.church.isSuperAdmin ||
                    (churchDetail.church.isDeputyAdmin && member.role === "member"));

                return (
                  <div key={member.userId} className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{member.profile.displayName}</p>
                          <ChurchRoleBadge role={member.role} />
                        </div>
                        <p className="mt-2 text-sm text-base-content/60">
                          {member.profile.email ?? member.userId}
                        </p>
                        <p className="mt-1 text-sm text-base-content/60">
                          {member.teamName ? `${t("church.teamLabel")} ${member.teamName}` : t("church.noTeamAssigned")}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {canToggleDeputy ? (
                          <button
                            type="button"
                            className={`btn btn-sm ${member.role === "deputy_admin" ? "btn-outline" : "btn-primary"}`}
                            disabled={processingKey === `role-${member.userId}`}
                            onClick={async () => {
                              setProcessingKey(`role-${member.userId}`);
                              try {
                                await updateMemberRole({
                                  churchId: churchDetail.church.id,
                                  userId: member.userId,
                                  role: member.role === "deputy_admin" ? "member" : "deputy_admin",
                                });
                                showToast(
                                  member.role === "deputy_admin"
                                    ? t("toast.deputyRevoked")
                                    : t("toast.deputyGranted"),
                                );
                              } catch (roleError) {
                                showToast(roleError instanceof Error ? roleError.message : t("church.roleUpdateFailed"));
                              } finally {
                                setProcessingKey(null);
                              }
                            }}
                          >
                            {processingKey === `role-${member.userId}` ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : member.role === "deputy_admin" ? (
                              <ShieldOff className="size-4" />
                            ) : (
                              <Shield className="size-4" />
                            )}
                            {member.role === "deputy_admin" ? t("church.revokeDeputy") : t("church.grantDeputy")}
                          </button>
                        ) : null}

                        {canRemoveMember ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            disabled={processingKey === `remove-${member.userId}`}
                            onClick={async () => {
                              if (!window.confirm(t("church.removeMemberConfirm").replace("{name}", member.profile.displayName))) return;
                              setProcessingKey(`remove-${member.userId}`);
                              try {
                                await removeMember({
                                  churchId: churchDetail.church.id,
                                  userId: member.userId,
                                });
                                showToast(t("toast.memberRemoved"));
                              } catch (removeError) {
                                showToast(removeError instanceof Error ? removeError.message : t("church.memberRemoveFailed"));
                              } finally {
                                setProcessingKey(null);
                              }
                            }}
                          >
                            {processingKey === `remove-${member.userId}` ? <Loader2 className="size-4 animate-spin" /> : <UserMinus className="size-4" />}
                            {t("church.removeMember")}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {canManageMemberTeam ? (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <select
                          className="select select-bordered select-sm flex-1"
                          value={teamSelectValue}
                          onChange={(event) =>
                            setSelectedMemberTeamIds((previous) => ({
                              ...previous,
                              [member.userId]: event.target.value,
                            }))
                          }
                        >
                          <option value="">{t("church.noTeam")}</option>
                          {churchDetail.teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={processingKey === `team-${member.userId}`}
                          onClick={async () => {
                            setProcessingKey(`team-${member.userId}`);
                            try {
                              await updateMemberTeam({
                                churchId: churchDetail.church.id,
                                userId: member.userId,
                                teamId: teamSelectValue || null,
                              });
                              showToast(t("toast.memberTeamUpdated"));
                            } catch (teamError) {
                              showToast(teamError instanceof Error ? teamError.message : t("church.memberTeamUpdateFailed"));
                            } finally {
                              setProcessingKey(null);
                            }
                          }}
                        >
                          {processingKey === `team-${member.userId}` ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                          {t("church.saveTeamAssignment")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          </div>
        ) : null}

        {activeTab === "plans" ? (
          <div className="space-y-4">
            {churchDetail.church.isSuperAdmin ? (
              <Link href={`/churches/${churchDetail.church.id}/plans/add`} className="btn btn-primary w-full">
                <Plus className="size-4" />
                {t("church.createChurchPlan")}
              </Link>
            ) : null}

            {churchDetail.plans.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 px-5 py-10 text-center text-sm text-base-content/55">
                {t("church.emptyChurchPlans")}
              </div>
            ) : (
              churchDetail.plans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/churches/${churchDetail.church.id}/plans/${plan.id}`}
                  className="block rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm transition hover:bg-base-200/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{plan.planName}</p>
                      <p className="mt-2 text-sm text-base-content/60">
                        {t("church.planCreatedBy").replace("{name}", plan.createdByName)}
                      </p>
                      <p className="mt-1 text-sm text-base-content/60">
                        {plan.startDate} ~ {plan.endDate}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                      {plan.averageGoalPercent.toFixed(1)}%
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : null}

        {activeTab === "prayers" ? (
          <div className="space-y-4">
            {prayerAudienceOptions.length > 0 ? (
              <button type="button" className="btn btn-primary w-full" onClick={createPrayerDrawer.open}>
                <Plus className="size-4" />
                {t("church.createPrayer")}
              </button>
            ) : null}

            {churchWidePrayers.length === 0 && teamPrayerGroups.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 px-5 py-10 text-center text-sm text-base-content/55">
                {t("church.emptySharedPrayers")}
              </div>
            ) : null}

            {churchWidePrayers.length > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Heart className="size-4 text-primary" />
                  <h2 className="font-semibold">{t("church.churchPrayerSection")}</h2>
                </div>

                {churchWidePrayers.map((prayer) => (
                  <section key={prayer.id} className="rounded-[1.75rem] border border-base-300 bg-base-100 shadow-sm">
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 px-5 py-5 text-left"
                      onClick={() =>
                        setExpandedPrayerId((previous) =>
                          previous === prayer.id ? null : prayer.id,
                        )
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-primary">
                            {buildPrayerLabel(prayer.requester, prayer.target, t)}
                          </p>
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                            {t("church.churchPrayerScopeShort")}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-7">
                          {prayer.latestContent || t("church.noPrayerContents")}
                        </p>
                        <p className="mt-3 text-xs text-base-content/45">
                          {formatShortDateTime(prayer.updatedAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-base-200 px-3 py-2 text-sm font-medium text-base-content/70">
                        {t("church.prayerContentCount").replace("{count}", String(prayer.contentCount))}
                      </div>
                    </button>

                    {expandedPrayerId === prayer.id ? (
                      <div className="space-y-4 border-t border-base-300 px-5 py-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl bg-base-200 px-4 py-3">
                            <p className="text-xs font-medium text-base-content/55">{t("mypage.prayerRequester")}</p>
                            <p className="mt-2 text-sm font-semibold">{prayer.requester || "-"}</p>
                          </div>
                          <div className="rounded-2xl bg-base-200 px-4 py-3">
                            <p className="text-xs font-medium text-base-content/55">{t("mypage.prayerTarget")}</p>
                            <p className="mt-2 text-sm font-semibold">{prayer.target || "-"}</p>
                          </div>
                          <div className="rounded-2xl bg-base-200 px-4 py-3">
                            <p className="text-xs font-medium text-base-content/55">{t("church.prayerCreatedByLabel")}</p>
                            <p className="mt-2 text-sm font-semibold">{prayer.createdByName}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              setSelectedPrayer(prayer);
                              appendPrayerDrawer.open();
                            }}
                          >
                            <Plus className="size-4" />
                            {t("church.addPrayerContent")}
                          </button>
                          {prayer.canManagePrayer ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => {
                                  setSelectedPrayer(prayer);
                                  editPrayerDrawer.open();
                                }}
                              >
                                <Pencil className="size-4" />
                                {t("church.editPrayer")}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                disabled={processingKey === `delete-prayer-${prayer.id}`}
                                onClick={async () => {
                                  if (!window.confirm(t("church.deletePrayerConfirm"))) return;
                                  setProcessingKey(`delete-prayer-${prayer.id}`);
                                  try {
                                    await deleteChurchPrayer({
                                      churchId: churchDetail.church.id,
                                      prayerId: prayer.id,
                                    });
                                    showToast(t("toast.churchPrayerDeleted"));
                                    if (expandedPrayerId === prayer.id) {
                                      setExpandedPrayerId(null);
                                    }
                                  } catch (prayerError) {
                                    showToast(prayerError instanceof Error ? prayerError.message : t("church.prayerDeleteFailed"));
                                  } finally {
                                    setProcessingKey(null);
                                  }
                                }}
                              >
                                {processingKey === `delete-prayer-${prayer.id}` ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                                {t("church.deletePrayer")}
                              </button>
                            </>
                          ) : null}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Heart className="size-4 text-primary" />
                            <h3 className="font-semibold">{t("church.prayerContents")}</h3>
                          </div>

                          {prayer.contents.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-base-300 px-4 py-6 text-center text-sm text-base-content/55">
                              {t("church.noPrayerContents")}
                            </div>
                          ) : (
                            prayer.contents.map((content) => (
                              <div key={content.id} className="rounded-2xl border border-base-300 bg-base-200 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm leading-7">{content.content}</p>
                                    <p className="mt-3 text-xs text-base-content/45">
                                      {content.createdByName} · {formatShortDateTime(content.registeredAt)}
                                    </p>
                                  </div>

                                  {content.canManage ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-ghost btn-circle border border-base-300"
                                      disabled={processingKey === `delete-prayer-content-${content.id}`}
                                      onClick={async () => {
                                        if (!window.confirm(t("church.deletePrayerContentConfirm"))) return;
                                        setProcessingKey(`delete-prayer-content-${content.id}`);
                                        try {
                                          await deleteChurchPrayerContent({
                                            churchId: churchDetail.church.id,
                                            contentId: content.id,
                                          });
                                          showToast(t("toast.churchPrayerContentDeleted"));
                                        } catch (contentError) {
                                          showToast(contentError instanceof Error ? contentError.message : t("church.prayerContentDeleteFailed"));
                                        } finally {
                                          setProcessingKey(null);
                                        }
                                      }}
                                    >
                                      {processingKey === `delete-prayer-content-${content.id}` ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="size-4" />
                                      )}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </section>
                ))}
              </section>
            ) : null}

            {teamPrayerGroups.map((group) => (
              <section key={group.teamId} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Heart className="size-4 text-primary" />
                  <h2 className="font-semibold">
                    {t("church.teamPrayerSectionTitle").replace("{team}", group.teamName)}
                  </h2>
                </div>

                {group.prayers.map((prayer) => (
                  <section key={prayer.id} className="rounded-[1.75rem] border border-base-300 bg-base-100 shadow-sm">
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 px-5 py-5 text-left"
                      onClick={() =>
                        setExpandedPrayerId((previous) =>
                          previous === prayer.id ? null : prayer.id,
                        )
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-primary">
                            {buildPrayerLabel(prayer.requester, prayer.target, t)}
                          </p>
                          <span className="rounded-full bg-secondary/15 px-2 py-1 text-[11px] font-semibold text-secondary">
                            {t("church.teamPrayerScopeShort").replace("{team}", prayer.teamName ?? "-")}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-7">
                          {prayer.latestContent || t("church.noPrayerContents")}
                        </p>
                        <p className="mt-3 text-xs text-base-content/45">
                          {formatShortDateTime(prayer.updatedAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-base-200 px-3 py-2 text-sm font-medium text-base-content/70">
                        {t("church.prayerContentCount").replace("{count}", String(prayer.contentCount))}
                      </div>
                    </button>

                    {expandedPrayerId === prayer.id ? (
                      <div className="space-y-4 border-t border-base-300 px-5 py-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl bg-base-200 px-4 py-3">
                            <p className="text-xs font-medium text-base-content/55">{t("mypage.prayerRequester")}</p>
                            <p className="mt-2 text-sm font-semibold">{prayer.requester || "-"}</p>
                          </div>
                          <div className="rounded-2xl bg-base-200 px-4 py-3">
                            <p className="text-xs font-medium text-base-content/55">{t("mypage.prayerTarget")}</p>
                            <p className="mt-2 text-sm font-semibold">{prayer.target || "-"}</p>
                          </div>
                          <div className="rounded-2xl bg-base-200 px-4 py-3">
                            <p className="text-xs font-medium text-base-content/55">{t("church.prayerCreatedByLabel")}</p>
                            <p className="mt-2 text-sm font-semibold">{prayer.createdByName}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              setSelectedPrayer(prayer);
                              appendPrayerDrawer.open();
                            }}
                          >
                            <Plus className="size-4" />
                            {t("church.addPrayerContent")}
                          </button>
                          {prayer.canManagePrayer ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => {
                                  setSelectedPrayer(prayer);
                                  editPrayerDrawer.open();
                                }}
                              >
                                <Pencil className="size-4" />
                                {t("church.editPrayer")}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                disabled={processingKey === `delete-prayer-${prayer.id}`}
                                onClick={async () => {
                                  if (!window.confirm(t("church.deletePrayerConfirm"))) return;
                                  setProcessingKey(`delete-prayer-${prayer.id}`);
                                  try {
                                    await deleteChurchPrayer({
                                      churchId: churchDetail.church.id,
                                      prayerId: prayer.id,
                                    });
                                    showToast(t("toast.churchPrayerDeleted"));
                                    if (expandedPrayerId === prayer.id) {
                                      setExpandedPrayerId(null);
                                    }
                                  } catch (prayerError) {
                                    showToast(prayerError instanceof Error ? prayerError.message : t("church.prayerDeleteFailed"));
                                  } finally {
                                    setProcessingKey(null);
                                  }
                                }}
                              >
                                {processingKey === `delete-prayer-${prayer.id}` ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                                {t("church.deletePrayer")}
                              </button>
                            </>
                          ) : null}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Heart className="size-4 text-primary" />
                            <h3 className="font-semibold">{t("church.prayerContents")}</h3>
                          </div>

                          {prayer.contents.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-base-300 px-4 py-6 text-center text-sm text-base-content/55">
                              {t("church.noPrayerContents")}
                            </div>
                          ) : (
                            prayer.contents.map((content) => (
                              <div key={content.id} className="rounded-2xl border border-base-300 bg-base-200 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm leading-7">{content.content}</p>
                                    <p className="mt-3 text-xs text-base-content/45">
                                      {content.createdByName} · {formatShortDateTime(content.registeredAt)}
                                    </p>
                                  </div>

                                  {content.canManage ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-ghost btn-circle border border-base-300"
                                      disabled={processingKey === `delete-prayer-content-${content.id}`}
                                      onClick={async () => {
                                        if (!window.confirm(t("church.deletePrayerContentConfirm"))) return;
                                        setProcessingKey(`delete-prayer-content-${content.id}`);
                                        try {
                                          await deleteChurchPrayerContent({
                                            churchId: churchDetail.church.id,
                                            contentId: content.id,
                                          });
                                          showToast(t("toast.churchPrayerContentDeleted"));
                                        } catch (contentError) {
                                          showToast(contentError instanceof Error ? contentError.message : t("church.prayerContentDeleteFailed"));
                                        } finally {
                                          setProcessingKey(null);
                                        }
                                      }}
                                    >
                                      {processingKey === `delete-prayer-content-${content.id}` ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="size-4" />
                                      )}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </section>
                ))}
              </section>
            ))}
          </div>
        ) : null}

        {activeTab === "teams" ? (
          <div className="space-y-4">
            {churchDetail.church.canManageTeams ? (
              <section className="space-y-3 rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-base-content/55">{t("church.createTeamTitle")}</p>
                  <p className="mt-1 text-sm text-base-content/60">{t("church.createTeamDescription")}</p>
                </div>

                <div className="flex gap-2">
                  <input
                    value={creatingTeamName}
                    onChange={(event) => setCreatingTeamName(event.target.value)}
                    placeholder={t("church.teamNamePlaceholder")}
                    className="input input-bordered flex-1"
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={processingKey === "create-team" || !creatingTeamName.trim()}
                    onClick={async () => {
                      setProcessingKey("create-team");
                      try {
                        await createTeam({
                          churchId: churchDetail.church.id,
                          name: creatingTeamName,
                        });
                        setCreatingTeamName("");
                        showToast(t("toast.teamCreated"));
                      } catch (teamError) {
                        showToast(teamError instanceof Error ? teamError.message : t("church.teamCreateFailed"));
                      } finally {
                        setProcessingKey(null);
                      }
                    }}
                  >
                    {processingKey === "create-team" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    {t("church.createTeam")}
                  </button>
                </div>
              </section>
            ) : null}

            {churchDetail.teams.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 px-5 py-10 text-center text-sm text-base-content/55">
                {t("church.emptyTeams")}
              </div>
            ) : (
              churchDetail.teams.map((team) => (
                <section key={team.id} className="space-y-3 rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{team.name}</p>
                      <p className="mt-2 text-sm text-base-content/60">
                        {t("church.memberCount").replace("{count}", String(team.memberCount))}
                      </p>
                      <p className="mt-1 text-sm text-base-content/60">
                        {t("church.teamLeader").replace("{name}", team.leaderName ?? "-")}
                      </p>
                    </div>

                    {churchDetail.church.canManagePlans ? (
                      <Link href={`/churches/${churchDetail.church.id}/plans/add?teamId=${team.id}`} className="btn btn-sm btn-primary">
                        <Plus className="size-4" />
                        {t("church.createTeamPlan")}
                      </Link>
                    ) : null}
                  </div>

                  {churchDetail.church.canManageTeams ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        className="select select-bordered select-sm flex-1"
                        value={selectedTeamLeaderIds[team.id] ?? team.leaderUserId ?? ""}
                        onChange={(event) =>
                          setSelectedTeamLeaderIds((previous) => ({
                            ...previous,
                            [team.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">{t("church.noLeader")}</option>
                        {churchDetail.members
                          .filter((member) => member.teamId === team.id)
                          .map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.profile.displayName}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={processingKey === `leader-${team.id}`}
                        onClick={async () => {
                          setProcessingKey(`leader-${team.id}`);
                          try {
                            await updateTeamLeader({
                              churchId: churchDetail.church.id,
                              teamId: team.id,
                              leaderUserId: (selectedTeamLeaderIds[team.id] ?? team.leaderUserId ?? "") || null,
                            });
                            showToast(t("toast.teamLeaderUpdated"));
                          } catch (leaderError) {
                            showToast(leaderError instanceof Error ? leaderError.message : t("church.teamLeaderUpdateFailed"));
                          } finally {
                            setProcessingKey(null);
                          }
                        }}
                      >
                        {processingKey === `leader-${team.id}` ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        {t("church.saveLeader")}
                      </button>
                    </div>
                  ) : null}

                  {team.plans.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-base-300 px-4 py-6 text-center text-sm text-base-content/55">
                      {t("church.emptyTeamPlans")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {team.plans.map((plan) => (
                        <Link
                          key={plan.id}
                          href={`/churches/${churchDetail.church.id}/plans/${plan.id}`}
                          className="block rounded-2xl border border-base-300 px-4 py-4 transition hover:bg-base-200/50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{plan.planName}</p>
                              <p className="mt-1 text-sm text-base-content/60">
                                {t("church.planCreatedBy").replace("{name}", plan.createdByName)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                              {plan.averageGoalPercent.toFixed(1)}%
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              ))
            )}
          </div>
        ) : null}

        <ChurchPrayerSheet
          key={`create-prayer-${createPrayerDrawer.version}`}
          open={createPrayerDrawer.isOpen}
          mode="create"
          onClose={createPrayerDrawer.close}
          audienceOptions={prayerAudienceOptions}
          initialAudienceValue={prayerAudienceOptions[0]?.value ?? ""}
          isSubmitting={processingKey === "create-prayer"}
          onSubmit={async (input) => {
            setProcessingKey("create-prayer");
            try {
              await createChurchPrayer({
                churchId: churchDetail.church.id,
                teamId: input.teamId,
                requester: input.requester,
                target: input.target,
                content: input.content,
              });
              createPrayerDrawer.close();
              showToast(t("toast.churchPrayerCreated"));
            } catch (prayerError) {
              showToast(prayerError instanceof Error ? prayerError.message : t("church.prayerCreateFailed"));
            } finally {
              setProcessingKey(null);
            }
          }}
        />

        <ChurchPrayerSheet
          key={`edit-prayer-${editPrayerDrawer.version}-${selectedPrayer?.id ?? "none"}`}
          open={editPrayerDrawer.isOpen}
          mode="edit"
          onClose={() => {
            editPrayerDrawer.close();
            setSelectedPrayer(null);
          }}
          prayer={selectedPrayer}
          isSubmitting={processingKey === "edit-prayer"}
          onSubmit={async (input) => {
            if (!selectedPrayer) return;

            setProcessingKey("edit-prayer");
            try {
              await updateChurchPrayer({
                churchId: churchDetail.church.id,
                prayerId: selectedPrayer.id,
                requester: input.requester,
                target: input.target,
              });

              if (input.content.trim()) {
                await addChurchPrayerContent({
                  churchId: churchDetail.church.id,
                  prayerId: selectedPrayer.id,
                  content: input.content,
                });
              }

              editPrayerDrawer.close();
              setSelectedPrayer(null);
              showToast(t("toast.churchPrayerUpdated"));
            } catch (prayerError) {
              showToast(prayerError instanceof Error ? prayerError.message : t("church.prayerUpdateFailed"));
            } finally {
              setProcessingKey(null);
            }
          }}
        />

        <ChurchPrayerSheet
          key={`append-prayer-${appendPrayerDrawer.version}-${selectedPrayer?.id ?? "none"}`}
          open={appendPrayerDrawer.isOpen}
          mode="append"
          onClose={() => {
            appendPrayerDrawer.close();
            setSelectedPrayer(null);
          }}
          prayer={selectedPrayer}
          isSubmitting={processingKey === "append-prayer-content"}
          onSubmit={async (input) => {
            if (!selectedPrayer) return;

            setProcessingKey("append-prayer-content");
            try {
              await addChurchPrayerContent({
                churchId: churchDetail.church.id,
                prayerId: selectedPrayer.id,
                content: input.content,
              });
              appendPrayerDrawer.close();
              setSelectedPrayer(null);
              showToast(t("toast.churchPrayerContentAdded"));
            } catch (prayerError) {
              showToast(prayerError instanceof Error ? prayerError.message : t("church.prayerContentAddFailed"));
            } finally {
              setProcessingKey(null);
            }
          }}
        />
      </div>
    </div>
  );
}
