import type { ExecutionPlan } from "../brain/types";

export interface PlannerResult {
  success: boolean;
  plan?: ExecutionPlan;
  error?: string;
}