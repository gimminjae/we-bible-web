"use client";

import { notFound, useParams, useRouter } from "next/navigation";

import { PlanForm } from "@/components/plans/plan-form";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useChurchActions, useSharedPlanDetail } from "@/hooks/use-churches";
import { useHeader } from "@/hooks/use-header";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/utils/i18n";

export default function EditChurchPlanPage() {
  const params = useParams<{ id: string; planId: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { updateSharedPlan } = useChurchActions();
  const { sharedPlanDetail, isLoading, error } = useSharedPlanDetail(params.id, params.planId);

  useHeader(
    () => ({
      title: t("church.editPlanTitle"),
      eyebrow: t("common.back"),
      showBack: true,
    }),
    [t],
  );

  if (error) {
    if (error.message === "CHURCH_NOT_FOUND" || error.message === "PLAN_NOT_FOUND") {
      notFound();
    }

    return <LoadingScreen message={error.message} />;
  }

  if (isLoading) {
    return <LoadingScreen message="Loading plan..." />;
  }

  if (!sharedPlanDetail || !sharedPlanDetail.canEditPlan) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="px-4 py-5">
        <PlanForm
          initialValues={{
            planName: sharedPlanDetail.summary.planName,
            startDate: sharedPlanDetail.summary.startDate,
            endDate: sharedPlanDetail.summary.endDate,
            selectedBookCodes: sharedPlanDetail.summary.selectedBookCodes,
          }}
          submitLabel={t("planDrawer.save")}
          onSubmit={async (values) => {
            try {
              await updateSharedPlan({
                churchId: params.id,
                planId: params.planId,
                planName: values.planName,
                startDate: values.startDate,
                endDate: values.endDate,
                selectedBookCodes: values.selectedBookCodes,
              });
              showToast(t("toast.churchPlanUpdated"));
              router.replace(`/churches/${params.id}/plans/${params.planId}`);
            } catch (updateError) {
              showToast(updateError instanceof Error ? updateError.message : t("church.planUpdateFailed"));
            }
          }}
        />
      </div>
    </div>
  );
}
