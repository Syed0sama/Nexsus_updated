import os from "os";

import type {
  ICommand,
  CommandContext,
  CommandResult,
} from "./types";

export class SystemInfoCommand implements ICommand {
  readonly name = "systemInfo";

  async execute(
    _context: CommandContext
  ): Promise<CommandResult> {
    return {
      success: true,
      data: {
        platform: process.platform,
        version: process.version,
        memory: process.memoryUsage(),
        hostname: os.hostname(),
        cpuCount: os.cpus().length,
        architecture: process.arch,
      },
    };
  }
}