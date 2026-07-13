import type { ExecutionPlan } from "../brain/types";

export function logPlan(
  input: string,
  plan: ExecutionPlan,
  durationMs: number
): void {
  console.log("\n========== NEXUS PLANNER ==========");
  console.log("Input     :", input);
  console.log("Decision  :", plan.type);

  if (plan.type === "tool") {
    console.log("Command   :", plan.command);
  } else {
    console.log("Chat      : yes");
  }

  console.log("Duration  :", `${durationMs} ms`);
  console.log("Source    :", plan.metadata?.source);
  console.log("===================================\n");
}