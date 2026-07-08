import type {
  ICommand,
  CommandContext,
  CommandResult,
} from "./types";

export class TimeCommand implements ICommand {
  readonly name = "time";

  async execute(
    _context: CommandContext
  ): Promise<CommandResult> {
    return {
      success: true,
      data: {
        time: new Date().toISOString(),
      },
    };
  }
}