import type {
  ICommand,
  CommandContext,
  CommandResult,
} from "./types";


export class PingCommand implements ICommand {
  readonly name = "ping";

  readonly description =
    "Checks whether Nexus is running and responds with pong";


  async execute(
    _context: CommandContext
  ): Promise<CommandResult> {
    return {
      success: true,
      data: "pong from Nexus",
    };
  }
}