"use client";

import { notFound, useParams, useRouter } from "next/navigation";

import { PlanForm } from "@/components/plans/plan-form";
import { PageHeader } from "@/components/ui/page-header";
import { updatePlanComputedFields } from "@/lib/plan";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { useI18n } from "@/utils/i18n";

export default function EditPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const plan = useAppStore((state) => state.plans.find((item) => item.id === params.id));
  const updatePlanInfo = useAppStore((state) => state.updatePlanInfo);

  if (!plan) {
    notFound();
  }

  const currentPlan = updatePlanComputedFields(plan);

  return (
    <div className="min-h-screen bg-base-100">
      <PageHeader title={t("planDrawer.editTitle")} />
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
