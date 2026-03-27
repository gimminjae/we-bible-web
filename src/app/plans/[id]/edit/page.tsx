"use client";

import { notFound, useParams, useRouter } from "next/navigation";

import { PlanForm } from "@/components/plans/plan-form";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useHeader } from "@/hooks/use-header";
import { usePlans } from "@/hooks/use-plans";
import { updatePlanComputedFields } from "@/lib/plan";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/utils/i18n";

export default function EditPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { plans, updatePlanInfo, isLoading, error } = usePlans();
  const plan = plans.find((item) => item.id === params.id);

  useHeader(
    () => ({
      title: t("planDrawer.editTitle"),
      eyebrow: t("common.back"),
      showBack: true,
    }),
    [t],
  );

  if (error) {
    return <LoadingScreen message={error} />;
  }

  if (isLoading) {
    return <LoadingScreen message="Loading plan..." />;
  }

  if (!plan) {
    notFound();
  }

  const currentPlan = updatePlanComputedFields(plan);

  return (
    <div className="min-h-screen bg-base-100">
      <div className="px-4 py-5">
        <PlanForm
          initialValues={{
            planName: currentPlan.planName,
            startDate: currentPlan.startDate,
            endDate: currentPlan.endDate,
            selectedBookCodes: currentPlan.selectedBookCodes,
          }}
          submitLabel={t("planDrawer.save")}
          onSubmit={(values) => {
            updatePlanInfo(currentPlan.id, values);
            showToast(t("toast.planUpdated"));
            router.back();
          }}
        />
      </div>
    </div>
  );
}
