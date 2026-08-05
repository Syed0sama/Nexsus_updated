import type { ExecutionPlan } from "../brain/types";
import type { PlannerResult } from "./types";


function extractJson(response: string): string {
  let text = response.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

  // Find the first { and its matching closing } by bracket depth,
  // in case there's still leading/trailing text around the JSON.
  const start = text.indexOf("{");
  if (start === -1) return text;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") depth--;
    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }

  return text.slice(start);
}

function normalizeOpenResource(
  plan: ExecutionPlan
): ExecutionPlan {
  if (
    plan.type !== "tool" ||
    plan.command !== "openApp"
  ) {
    return plan;
  }

  const payload = plan.payload as {
    target?: string;
    app?: string;
    url?: string;
  };

  if (!payload) {
    return plan;
  }

  const target = payload.target ?? payload.app;

  if (!target) {
    return plan;
  }

  return {
    ...plan,
    payload: {
      target,
      ...(payload.url
        ? { url: payload.url }
        : {}),
    },
  };
}

function normalizeFolderIntent(
  input: string,
  plan: ExecutionPlan
): ExecutionPlan {
  if (
    plan.type !== "tool" ||
    plan.command !== "openApp"
  ) {
    return plan;
  }

  const folders = [
    "desktop",
    "downloads",
    "documents",
    "pictures",
    "music",
    "videos",
  ];

  const requestedFolder = folders.find((folder) =>
    input.toLowerCase().includes(folder)
  );

  if (!requestedFolder) {
    return plan;
  }

  return {
    ...plan,
    payload: {
      target:
        requestedFolder.charAt(0).toUpperCase() +
        requestedFolder.slice(1),
    },
  };
}

export function parsePlannerResponse(
  response: string,
  input?: string
): PlannerResult {
  try {
    const parsed = JSON.parse(extractJson(response));

    if (
      parsed &&
      parsed.type === "tool" &&
      typeof parsed.command === "string"
    ) {
      let plan: ExecutionPlan = {
        type: "tool",
        command: parsed.command,
        payload: parsed.payload,
        metadata: {
          source: "planner",
          createdAt: new Date().toISOString(),
        },
      };

      if (input) {
        plan = normalizeFolderIntent(
          input,
          plan
        );
      }

      plan = normalizeOpenResource(plan);

      return {
        success: true,
        plan,
      };
    }

    // Chat requests should always preserve the original user input.
    if (parsed && parsed.type === "chat") {
      const plan: ExecutionPlan = {
        type: "chat",
        text: input ?? "",
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