import type { ExecutionPlan } from "../brain/types";
import type { PlannerResult } from "./types";

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
    const parsed = JSON.parse(response);

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