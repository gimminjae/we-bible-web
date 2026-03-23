"use client";

import { useRouter } from "next/navigation";

import { PlanForm } from "@/components/plans/plan-form";
import { useHeader } from "@/hooks/use-header";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { useI18n } from "@/utils/i18n";

export default function AddPlanPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const addPlan = useAppStore((state) => state.addPlan);

  useHeader(
    () => ({
      title: t("planDrawer.addTitle"),
      eyebrow: t("common.back"),
      showBack: true,
    }),
    [t],
  );

  return (
    <div className="min-h-screen bg-base-100">
      <div className="px-4 py-5">
        <PlanForm
          submitLabel={t("planDrawer.save")}
          onSubmit={(values) => {
            const id = addPlan(values);
            showToast(t("toast.planAdded"));
            router.replace(`/plans/${id}`);
          }}
        />
      </div>
    </div>
  );
}
