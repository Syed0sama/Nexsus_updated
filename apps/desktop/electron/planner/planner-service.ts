import type { ExecutionPlan } from "../brain/types";
import { buildPlannerPrompt } from "./planner-prompt";
import { parsePlannerResponse } from "./planner-parser";
import { plannerProvider } from "./planner-provider";
import { retryPlanner } from "./planner-retry";
import { validatePlan } from "./planner-validator";
import { matchIntent } from "../brain/intent-matcher";

/**
 * Fast pre-check: is this input a system command (tool) or just chat?
 * Uses a tiny prompt (~30 tokens) instead of the full planner prompt
 * (~1000+ tokens with all tool descriptions/examples), which is the
 * dominant cost for CPU-bound local inference. Only used to short-
 * circuit obvious chat — anything uncertain falls through to the
 * full planner below, so tool-command accuracy is unaffected.
 */

// Known tool keywords bypass the fast classifier entirely. The fast
// classifier is a small/cheap LLM call and can misjudge borderline
// inputs (e.g. a WhatsApp command that also contains conversational
// phrasing) as "chat", which would skip the tool entirely. Anything
// matching one of these keywords always goes through the full planner.
const TOOL_KEYWORDS =
  /\b(whatsapp|open|volume|brightness|screenshot|battery|clipboard|notification|gmail|emails?|inbox|calendar|events?|schedule|meetings?|time|date)\b/i;

export async function plan(input: string): Promise<ExecutionPlan> {

    const directPlan = matchIntent(input);

    if (directPlan) {

        directPlan.metadata = {
            source: "intent-matcher",
            createdAt: new Date().toISOString(),
        };

        console.log("\n========== DIRECT MATCH ==========\n");
        console.dir(directPlan, { depth: null });

        return directPlan;
    }

    // Planner continues...
  const prompt = await buildPlannerPrompt(input);

  console.log("\n========== PLANNER PROMPT ==========\n");
  console.log(prompt);

 console.time("[Timing] Planner LLM call");
let response = await plannerProvider(prompt);
console.timeEnd("[Timing] Planner LLM call");

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