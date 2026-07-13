import { provider } from "../provider";
import { registry } from "../../commands";
import type { ExecutionPlan } from "../../brain/types";

function createPlannerPrompt(input: string): string {
  const tools = registry
    .getDescriptions()
    .map((tool) => {
      return `${tool.name}: ${tool.description}`;
    })
    .join("\n");

  return `
You are Nexus Planner.

Your job is to decide whether the user request requires a tool or normal AI chat.

Available tools:

${tools}

Rules:
- If a tool is required, return ONLY JSON:
{
  "type": "tool",
  "command": "toolName",
  "payload": {}
}

- If no tool is required, return ONLY JSON:
{
  "type": "chat",
  "text": "user request"
}

User request:
${input}
`.trim();
}

export async function createAIPlan(
  input: string
): Promise<ExecutionPlan | null> {
  const prompt = createPlannerPrompt(input);

  const response = await provider.chat(prompt);

  try {
    const parsed = JSON.parse(response);

    if (
      parsed.type === "tool" &&
      typeof parsed.command === "string"
    ) {
      return {
        type: "tool",
        command: parsed.command,
        payload: parsed.payload,
        metadata: {
          source: "ai-planner",
          createdAt: new Date().toISOString(),
        },
      };
    }

    if (
      parsed.type === "chat" &&
      typeof parsed.text === "string"
    ) {
      return {
        type: "chat",
        text: parsed.text,
        metadata: {
          source: "ai-planner",
          createdAt: new Date().toISOString(),
        },
      };
    }
  } catch {
    return null;
  }

  return null;
}