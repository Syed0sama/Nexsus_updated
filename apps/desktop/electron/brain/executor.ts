import { registry } from "../commands";
import type { ExecutionPlan } from "./types";

export class Executor {
  async execute(
    plan: ExecutionPlan,
    source: "voice" | "text" = "text"
  ) {
    switch (plan.type) {
      case "tool":
        return this.executeTool(plan);

      case "chat":
        return this.executeChat(plan, source);
    }
  }

  private async executeTool(
    plan: Extract<ExecutionPlan, { type: "tool" }>
  ) {
    const toolCommand = registry.get(plan.command);

    if (!toolCommand) {
      return {
        success: false,
        error: "UNKNOWN_COMMAND",
        command: plan.command,
      };
    }

    return toolCommand.execute({
      payload: plan.payload,
    });
  }

  private async executeChat(
    plan: Extract<ExecutionPlan, { type: "chat" }>,
    source: "voice" | "text"
  ) {
    const aiCommand = registry.get("ai");

    if (!aiCommand) {
      return {
        success: false,
        error: "AI_COMMAND_NOT_REGISTERED",
      };
    }

    return aiCommand.execute({
      payload: {
        text: plan.text,
        source,
      },
    });
  }
}