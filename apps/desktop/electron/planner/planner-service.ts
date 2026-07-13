import type { ExecutionPlan } from "../brain/types";
import { buildPlannerPrompt } from "./planner-prompt";
import { parsePlannerResponse } from "./planner-parser";
import { plannerProvider } from "./planner-provider";
import { retryPlanner } from "./planner-retry";
import { validatePlan } from "./planner-validator";

export async function plan(
  input: string
): Promise<ExecutionPlan> {
  const prompt = buildPlannerPrompt(input);

  console.log("\n========== PLANNER PROMPT ==========\n");
  console.log(prompt);

  let response = await plannerProvider(prompt);

  console.log("\n========== PLANNER RESPONSE ==========\n");
  console.log(response);

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = parsePlannerResponse(
  response,
  input
);

    console.log("\n========== PARSED RESULT ==========\n");
    console.dir(result, { depth: null });

    if (result.success && result.plan) {
      const validationError = validatePlan(result.plan);

      if (!validationError) {
        console.log("\n========== FINAL PLAN ==========\n");
        console.dir(result.plan, { depth: null });

        return result.plan;
      }

      console.warn(
        `[Planner] Validation failed (attempt ${attempt + 1}):`,
        validationError
      );
    } else {
      console.warn(
        `[Planner] Parse failed (attempt ${attempt + 1}):`,
        result.error
      );
    }

    if (attempt === 0) {
      console.log("\n========== RETRY ==========\n");

      response = await retryPlanner(prompt, response);

      console.log("\n========== RETRY RESPONSE ==========\n");
      console.log(response);
    }
  }

  console.warn("[Planner] Falling back to chat after retry.");

  return {
    type: "chat",
    text: input,
    metadata: {
      source: "planner-fallback",
      createdAt: new Date().toISOString(),
    },
  };
}