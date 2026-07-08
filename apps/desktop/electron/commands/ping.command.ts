import type {
  ICommand,
  CommandContext,
  CommandResult,
} from "./types";

export class PingCommand implements ICommand {
  readonly name = "ping";

  async execute(
    _context: CommandContext
  ): Promise<CommandResult> {
    return {
      success: true,
      data: "pong from Nexus",
    };
  }
}