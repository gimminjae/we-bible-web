"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Pencil, Trash2 } from "@/components/icons";
import { ChurchRoleBadge } from "@/components/churches/role-badge";
import { SharedPlanProgressSheet } from "@/components/churches/shared-plan-progress-sheet";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useBibleGrass } from "@/hooks/use-bible-grass";
import { useChurchActions, useSharedPlanDetail } from "@/hooks/use-churches";
import { useHeader } from "@/hooks/use-header";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { useI18n } from "@/utils/i18n";

export default function ChurchPlanDetailPage() {
  const params = useParams<{ id: string; planId: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { sharedPlanDetail, isLoading, error } = useSharedPlanDetail(params.id, params.planId);
  const { isLoading: isGrassLoading, error: grassError } = useBibleGrass();
  const { deleteSharedPlan, updateSharedPlanProgress } = useChurchActions();
  const syncPlanGoalStatusToGrass = useAppStore((state) => state.syncPlanGoalStatusToGrass);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const planTitle = sharedPlanDetail?.summary.planName ?? t("church.planDetailTitle");
  const canEditPlan = Boolean(sharedPlanDetail?.canEditPlan);

  const handleDeletePlan = useCallback(async () => {
    try {
      await deleteSharedPlan({
        churchId: params.id,
        planId: params.planId,
      });
      showToast(t("toast.churchPlanDeleted"));
      router.replace(`/churches/${params.id}`);
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : t("church.planDeleteFailed"));
    }
  }, [deleteSharedPlan, params.id, params.planId, router, showToast, t]);

  const headerActions = useMemo(() => {
    if (!canEditPlan) {
      return null;
    }

    return (
      <>
        <Link href={`/churches/${params.id}/plans/${params.planId}/edit`} className="btn btn-sm btn-primary">
          <Pencil className="size-4" />
          {t("mypage.editPlan")}
        </Link>
        <button type="button" className="btn btn-sm btn-error" onClick={handleDeletePlan}>
          <Trash2 className="size-4" />
          {t("mypage.deletePlan")}
        </button>
      </>
    );
  }, [canEditPlan, handleDeletePlan, params.id, params.planId, t]);

  useHeader(
    () => ({
      title: planTitle,
      eyebrow: t("common.back"),
      showBack: true,
      actions: headerActions,
    }),
    [headerActions, planTitle, t],
  );

  const selectedMemberProgress = useMemo(
    () => sharedPlanDetail?.memberProgressList.find((item) => item.userId === selectedUserId) ?? null,
    [selectedUserId, sharedPlanDetail],
  );

  const loadErrorMessage = error?.message ?? grassError ?? null;

  if (loadErrorMessage) {
    if (loadErrorMessage === "CHURCH_NOT_FOUND" || loadErrorMessage === "PLAN_NOT_FOUND") {
      notFound();
    }

    return <LoadingScreen message={loadErrorMessage} />;
  }

  if (isLoading || isGrassLoading) {
    return <LoadingScreen message="Loading plan..." />;
  }

  if (!sharedPlanDetail) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="space-y-4 px-4 py-5">
        <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <p className="text-sm font-medium text-base-content/50">{t("church.planScope")}</p>
          <p className="mt-2 text-base">
            {sharedPlanDetail.team
              ? t("church.teamPlanScope").replace("{team}", sharedPlanDetail.team.name)
              : t("church.churchPlanScope")}
          </p>
          <p className="mt-3 text-sm text-base-content/60">
            {sharedPlanDetail.summary.startDate} ~ {sharedPlanDetail.summary.endDate}
          </p>
          <p className="mt-1 text-sm text-base-content/60">
            {t("church.planCreatedBy").replace("{name}", sharedPlanDetail.summary.createdByName)}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
            <p className="text-sm font-medium text-base-content/50">{t("church.averageProgress")}</p>
            <p className="mt-3 text-2xl font-semibold text-primary">{sharedPlanDetail.averageGoalPercent.toFixed(2)}%</p>
          </div>
          <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm">
            <p className="text-sm font-medium text-base-content/50">{t("church.myProgress")}</p>
            <p className="mt-3 text-2xl font-semibold text-primary">
              {sharedPlanDetail.myProgress ? `${sharedPlanDetail.myProgress.plan.goalPercent.toFixed(2)}%` : "-"}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("church.memberProgressList")}</h2>
            <span className="text-sm text-base-content/55">{sharedPlanDetail.memberProgressList.length}</span>
          </div>

          {sharedPlanDetail.memberProgressList.map((member) => (
            <button
              key={member.userId}
              type="button"
              className="w-full rounded-[1.75rem] border border-base-300 bg-base-100 p-5 text-left shadow-sm transition hover:bg-base-200/50"
              onClick={() => setSelectedUserId(member.userId)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {member.profile.displayName}
                      {sharedPlanDetail.myProgress?.userId === member.userId ? ` · ${t("church.me")}` : ""}
                    </p>
                    <ChurchRoleBadge role={member.role} />
                  </div>
                  <p className="mt-2 text-sm text-base-content/60">
                    {member.teamName ? `${t("church.teamLabel")} ${member.teamName}` : t("church.noTeamAssigned")}
                  </p>
                </div>

                <div className="rounded-2xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                  {member.plan.goalPercent.toFixed(1)}%
                </div>
              </div>
            </button>
          ))}
        </section>
      </div>

      <SharedPlanProgressSheet
        open={Boolean(selectedMemberProgress)}
        onClose={() => setSelectedUserId(null)}
        memberProgress={selectedMemberProgress}
        canEdit={Boolean(selectedMemberProgress && sharedPlanDetail.myProgress?.userId === selectedMemberProgress.userId && sharedPlanDetail.canUpdateMyProgress)}
        onSave={async (goalStatus) => {
          if (!selectedMemberProgress || sharedPlanDetail.myProgress?.userId !== selectedMemberProgress.userId) {
            return;
          }

          try {
            const previousGoalStatus = selectedMemberProgress.plan.goalStatus.map((row) => [...row]);
            await updateSharedPlanProgress({
              churchId: params.id,
              planId: params.planId,
              endDate: sharedPlanDetail.summary.endDate,
              selectedBookCodes: sharedPlanDetail.summary.selectedBookCodes,
              goalStatus,
            });
            syncPlanGoalStatusToGrass({
              selectedBookCodes: sharedPlanDetail.summary.selectedBookCodes,
              previousGoalStatus,
              nextGoalStatus: goalStatus,
            });
            showToast(t("toast.churchPlanProgressUpdated"));
          } catch (saveError) {
            showToast(saveError instanceof Error ? saveError.message : t("church.planProgressUpdateFailed"));
          }
        }}
      />
    </div>
  );
}
