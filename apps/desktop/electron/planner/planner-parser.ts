import type { ExecutionPlan } from "../brain/types";
import type { PlannerResult } from "./types";

export function parsePlannerResponse(
  response: string
): PlannerResult {
  try {
    const parsed = JSON.parse(response);

    if (
      parsed &&
      parsed.type === "tool" &&
      typeof parsed.command === "string"
    ) {
      const plan: ExecutionPlan = {
        type: "tool",
        command: parsed.command,
        payload: parsed.payload,
        metadata: {
          source: "planner",
          createdAt: new Date().toISOString(),
        },
      };

      return {
        success: true,
        plan,
      };
    }

    if (
      parsed &&
      parsed.type === "chat" &&
      typeof parsed.text === "string"
    ) {
      const plan: ExecutionPlan = {
        type: "chat",
        text: parsed.text,
        metadata: {
          source: "planner",
          createdAt: new Date().toISOString(),
        },
      };

      return {
        success: true,
        plan,
      };
    }

    return {
      success: false,
      error: "INVALID_PLAN",
    };
  } catch {
    return {
      success: false,
      error: "INVALID_JSON",
    };
  }
}