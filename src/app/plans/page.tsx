"use client";

import Link from "next/link";

import { Plus } from "@/components/icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useMySharedPlans } from "@/hooks/use-churches";
import { useHeader } from "@/hooks/use-header";
import { usePlans } from "@/hooks/use-plans";
import { formatShortDate } from "@/lib/date";
import { getPlanGoalSummary, updatePlanComputedFields } from "@/lib/plan";
import { useI18n } from "@/utils/i18n";

export default function PlansPage() {
  const { t } = useI18n();
  const { plans, isLoading, error } = usePlans();
  const { sharedPlans, isLoading: isSharedPlansLoading, error: sharedPlansError } = useMySharedPlans();

  useHeader(
    () => ({
      title: t("mypage.plansTitle"),
      eyebrow: t("common.back"),
      showBack: true,
      actions: (
        <Link href="/plans/add" className="btn btn-sm btn-primary">
          <Plus className="size-4" />
          {t("mypage.addPlan")}
        </Link>
      ),
    }),
    [t],
  );

  if (error) {
    return <LoadingScreen message={error} />;
  }

  if (sharedPlansError) {
    return <LoadingScreen message={sharedPlansError.message} />;
  }

  if (isLoading || isSharedPlansLoading) {
    return <LoadingScreen message="Loading plans..." />;
  }

  const computedPlans = plans.map((plan) => updatePlanComputedFields(plan));

  return (
    <div className="min-h-screen bg-base-100">
      <div className="space-y-6 px-4 py-5">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("mypage.personalPlansSection")}</h2>
            <span className="text-sm text-base-content/55">{computedPlans.length}</span>
          </div>

          {computedPlans.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 px-5 py-10 text-center text-sm text-base-content/55">
              {t("mypage.emptyPlans")}
            </div>
          ) : (
            computedPlans.map((plan) => {
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
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("mypage.sharedPlansSection")}</h2>
            <span className="text-sm text-base-content/55">{sharedPlans.length}</span>
          </div>

          {sharedPlans.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100 px-5 py-10 text-center text-sm text-base-content/55">
              {t("mypage.emptySharedPlans")}
            </div>
          ) : (
            sharedPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/churches/${plan.churchId}/plans/${plan.id}`}
                className="block rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm transition hover:bg-base-200/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-lg font-semibold">{plan.planName || t("church.planDetailTitle")}</p>
                    <p className="mt-2 text-sm text-base-content/60">{plan.churchName}</p>
                    <p className="mt-1 text-sm text-base-content/60">
                      {plan.teamName
                        ? t("church.teamPlanScope").replace("{team}", plan.teamName)
                        : t("church.churchPlanScope")}
                    </p>
                    <p className="mt-1 text-sm text-base-content/60">
                      {plan.startDate} ~ {plan.endDate}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                    {plan.myGoalPercent?.toFixed(1) ?? "0.0"}%
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                  <span className="text-base-content/60">{t("church.planCreatedBy").replace("{name}", plan.createdByName)}</span>
                  <span className="font-medium text-primary">{plan.averageGoalPercent.toFixed(1)}%</span>
                </div>
              </Link>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
