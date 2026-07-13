import type {
  ICommand,
  CommandContext,
  CommandResult,
} from "./types";

import { orchestrate } from "../ai/core/orchestrator";


export class AICommand implements ICommand {
  readonly name = "ai";

  readonly description =
    "Handles general conversation and questions that do not require a specific tool";


  async execute(
    context: CommandContext
  ): Promise<CommandResult> {
    const text =
      (context.payload as { text?: string })?.text ?? "";

    return orchestrate(text);
  }
}