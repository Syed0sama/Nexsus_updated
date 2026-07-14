import {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types";

import { BatteryService } from "../../services/battery.service"

export class BatteryCommand implements ICommand {
  readonly name = "battery";

  readonly description =
    "Get current battery status.";

  readonly parameters = [];

  readonly plannerHints = [
    "battery",
    "battery status",
    "how much battery is left",
    "remaining battery",
  ] as const;

  private readonly battery =
    new BatteryService();

  async execute(
    _: CommandContext
  ): Promise<CommandResult> {
    try {
      const info =
        await this.battery.getStatus();

      return {
        success: true,
        type: "command",
        data: info,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get battery status.",
      };
    }
  }
}