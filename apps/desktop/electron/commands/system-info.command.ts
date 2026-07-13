import type {
  ICommand,
  CommandContext,
  CommandResult,
} from "./types";


export class SystemInfoCommand implements ICommand {
  readonly name = "systemInfo";

  readonly description =
    "Provides information about the current system environment";


  async execute(
    _context: CommandContext
  ): Promise<CommandResult> {
    return {
      success: true,
      data: {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
      },
    };
  }
}