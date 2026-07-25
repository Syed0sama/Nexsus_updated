import type { ExecutionPlan } from "../brain/types";
import { buildPlannerPrompt } from "./planner-prompt";
import { parsePlannerResponse } from "./planner-parser";
import { plannerProvider } from "./planner-provider";
import { retryPlanner } from "./planner-retry";
import { validatePlan } from "./planner-validator";
import { ollamaProvider } from "../ai/provider/ollama";

/**
 * Fast pre-check: is this input a system command (tool) or just chat?
 * Uses a tiny prompt (~30 tokens) instead of the full planner prompt
 * (~1000+ tokens with all tool descriptions/examples), which is the
 * dominant cost for CPU-bound local inference. Only used to short-
 * circuit obvious chat — anything uncertain falls through to the
 * full planner below, so tool-command accuracy is unaffected.
 */
async function isLikelyChat(input: string): Promise<boolean> {
  const prompt = `Is the following user input a command to control a computer system (e.g. open an app, adjust volume/brightness, take a screenshot, send a WhatsApp message, check battery, start/stop voice recording) — or is it a question, statement, or general conversation?

Input: "${input}"

Reply with ONLY one word: command or chat`;

  try {
    const answer = await ollamaProvider.chat(prompt);
    return answer.trim().toLowerCase().startsWith("chat");
  } catch (error) {
    console.warn("[Planner] Fast classify failed, falling back to full planner:", error);
    return false;
  }
}

// Known tool keywords bypass the fast classifier entirely. The fast
// classifier is a small/cheap LLM call and can misjudge borderline
// inputs (e.g. a WhatsApp command that also contains conversational
// phrasing) as "chat", which would skip the tool entirely. Anything
// matching one of these keywords always goes through the full planner.
const TOOL_KEYWORDS =
  /\b(whatsapp|open|volume|brightness|screenshot|battery|clipboard|notification)\b/i;

export async function plan(
  input: string
): Promise<ExecutionPlan> {
  // Fast path: skip the heavy planner prompt entirely for obvious chat.
  // This does not change behavior for tool commands — those always
  // fall through to the exact same full-planner logic as before.
  const skipFastClassify = TOOL_KEYWORDS.test(input);
  const likelyChat = skipFastClassify ? false : await isLikelyChat(input);

  console.log("\n========== FAST CLASSIFY ==========\n");
  console.log(
    skipFastClassify
      ? "skipped (tool keyword matched — using full planner)"
      : likelyChat
      ? "chat (skipping full planner)"
      : "command (using full planner)"
  );

  if (likelyChat) {
    return {
      type: "chat",
      text: input,
      metadata: {
        source: "planner-fast-chat",
        createdAt: new Date().toISOString(),
      },
    };
  }

  const prompt = await buildPlannerPrompt(input);

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