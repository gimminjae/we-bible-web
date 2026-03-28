"use client";

import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";

import { PlanForm } from "@/components/plans/plan-form";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useChurchActions, useChurchDetail } from "@/hooks/use-churches";
import { useHeader } from "@/hooks/use-header";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/utils/i18n";

export default function AddChurchPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { createSharedPlan } = useChurchActions();
  const { churchDetail, isLoading, error } = useChurchDetail(params.id);
  const teamId = searchParams.get("teamId");
  const team = churchDetail?.teams.find((item) => item.id === teamId) ?? null;

  useHeader(
    () => ({
      title: team ? t("church.addTeamPlanTitle").replace("{team}", team.name) : t("church.addChurchPlanTitle"),
      eyebrow: t("common.back"),
      showBack: true,
    }),
    [t, team],
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

  if ((teamId ? !churchDetail.church.canManagePlans : !churchDetail.church.isSuperAdmin) || (teamId && !team)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="px-4 py-5">
        <PlanForm
          submitLabel={t("planDrawer.save")}
          onSubmit={async (values) => {
            try {
              const planId = await createSharedPlan({
                churchId: churchDetail.church.id,
                teamId,
                planName: values.planName,
                startDate: values.startDate,
                endDate: values.endDate,
                selectedBookCodes: values.selectedBookCodes,
              });
              showToast(t("toast.churchPlanCreated"));
              router.replace(`/churches/${churchDetail.church.id}/plans/${planId}`);
            } catch (createError) {
              showToast(createError instanceof Error ? createError.message : t("church.planCreateFailed"));
            }
          }}
        />
      </div>
    </div>
  );
}
