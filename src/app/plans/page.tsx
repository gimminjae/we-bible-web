"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { formatShortDate } from "@/lib/date";
import { getPlanGoalSummary, updatePlanComputedFields } from "@/lib/plan";
import { useI18n } from "@/utils/i18n";
import { useAppStore } from "@/store/app-store";

export default function PlansPage() {
  const { t } = useI18n();
  const plans = useAppStore((state) => state.plans).map((plan) => updatePlanComputedFields(plan));

  return (
    <div className="min-h-screen bg-base-100">
      <PageHeader
        title={t("mypage.plansTitle")}
        actions={
          <Link href="/plans/add" className="btn btn-sm btn-primary">
            <Plus className="size-4" />
            {t("mypage.addPlan")}
          </Link>
        }
      />

      <div className="space-y-3 px-4 py-5">
        {plans.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 px-5 py-10 text-center text-sm text-base-content/55">
            {t("mypage.emptyPlans")}
          </div>
        ) : (
          plans.map((plan) => {
            const summary = getPlanGoalSummary(plan.selectedBookCodes);
            return (
              <Link key={plan.id} href={`/plans/${plan.id}`} className="block rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm transition hover:bg-base-200/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-lg font-semibold">{plan.planName || t("mypage.planDetailTitle")}</p>
                    <p className="mt-2 text-sm text-base-content/60">
                      {summary.oldTestament > 0 ? `${t("bibleDrawer.oldTestament")} ${summary.oldTestament}` : ""}
                      {summary.oldTestament > 0 && summary.newTestament > 0 ? " · " : ""}
                      {summary.newTestament > 0 ? `${t("bibleDrawer.newTestament")} ${summary.newTestament}` : ""}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                    {plan.goalPercent.toFixed(1)}%
                  </div>
                </div>

                <div className="mt-4 text-sm text-base-content/60">
                  {t("mypage.planStartDate")} {formatShortDate(plan.startDate)} · {t("mypage.planEndDate")} {formatShortDate(plan.endDate)}
                </div>
                <div className="mt-2 text-sm font-medium text-primary">
                  {plan.restDay} {t("mypage.planDaysRemaining")}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
