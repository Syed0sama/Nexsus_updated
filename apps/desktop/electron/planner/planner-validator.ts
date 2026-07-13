import { registry } from "../commands";
import type { ExecutionPlan } from "../brain/types";

export function validatePlan(
  plan: ExecutionPlan
): string | null {
  if (plan.type === "tool") {
    const commandName = plan.command.trim();

    if (!commandName) {
      return "Tool command is required.";
    }

    if (!registry.has(commandName)) {
      return `Unknown tool: ${commandName}`;
    }

    const command = registry.get(commandName);

    if (!command) {
      return `Command "${commandName}" is not registered.`;
    }

    const payload = (plan.payload ?? {}) as Record<
      string,
      unknown
    >;

    const parameters = command.parameters ?? [];

    for (const parameter of parameters) {
      if (!parameter.required) {
        continue;
      }

      const value = payload[parameter.name];

      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" &&
          value.trim() === "")
      ) {
        return `Missing required parameter: ${parameter.name}`;
      }
    }
  }

  if (plan.type === "chat") {
    if (!plan.text.trim()) {
      return "Chat text is required.";
    }
  }

  return null;
}