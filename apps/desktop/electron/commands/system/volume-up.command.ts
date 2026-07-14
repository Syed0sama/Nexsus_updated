import {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types";

import { VolumeService } from "../../services/volume.service";

export class VolumeCommand implements ICommand {
  readonly name = "volume";

  readonly description =
    "Control system volume. Supports increase, decrease, mute and set volume.";

  readonly parameters = [
    {
      name: "action",
      type: "string",
      description:
        "Volume action: increase, decrease, mute or set.",
      required: true,
    },
    {
      name: "value",
      type: "number",
      description:
        "Volume percentage or step value.",
      required: false,
    },
  ] as const;

  readonly plannerHints = [
    "increase volume",
    "volume up",
    "turn volume up",
    "raise volume",
    "decrease volume",
    "volume down",
    "lower volume",
    "mute volume",
    "mute sound",
    "set volume",
    "set volume to 50",
    "set volume to 80 percent",
    "volume 30",
  ] as const;

  private readonly volumeService =
    new VolumeService();

  async execute(
    context: CommandContext
  ): Promise<CommandResult> {
    try {
      const payload =
        (context.payload ?? {}) as {
          action?: string;
          value?: number;
        };

      const action =
        payload.action?.toLowerCase() ?? "increase";

      const value =
        payload.value ?? 10;

      switch (action) {
        case "increase":
          await this.volumeService.increase(value);

          return {
            success: true,
            type: "command",
            data: `System volume increased by ${value}%.`,
          };

        case "decrease":
          await this.volumeService.decrease(value);

          return {
            success: true,
            type: "command",
            data: `System volume decreased by ${value}%.`,
          };

        case "mute":
          await this.volumeService.mute();

          return {
            success: true,
            type: "command",
            data: "System volume muted.",
          };

        case "set":
          await this.volumeService.set(value);

          return {
            success: true,
            type: "command",
            data: `System volume set to approximately ${value}%.`,
          };

        default:
          return {
            success: false,
            error: `Unsupported volume action: ${action}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Volume command failed.",
      };
    }
  }
}