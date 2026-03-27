"use client";

import { useAppStore } from "@/store/app-store";

import { usePersistedDomainLoad } from "@/hooks/use-persisted-domain-load";

const PLANS_SLICES = ["plans"] as const;

export function usePlans() {
  const { isLoading, error } = usePersistedDomainLoad([...PLANS_SLICES]);
  const plans = useAppStore((state) => state.plans);
  const addPlan = useAppStore((state) => state.addPlan);
  const updatePlanInfo = useAppStore((state) => state.updatePlanInfo);
  const updatePlanGoalStatus = useAppStore((state) => state.updatePlanGoalStatus);
  const deletePlan = useAppStore((state) => state.deletePlan);

  return {
    plans,
    addPlan,
    updatePlanInfo,
    updatePlanGoalStatus,
    deletePlan,
    isLoading,
    error,
  };
}
