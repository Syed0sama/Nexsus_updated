export interface PlanMetadata {
  id?: string;
  confidence?: number;
  source?: string;
  createdAt?: string;
}


export type ExecutionPlan =
  | {
      type: "tool";
      command: string;
      payload?: unknown;
      metadata?: PlanMetadata;
    }
  | {
      type: "chat";
      text: string;
      metadata?: PlanMetadata;
    };