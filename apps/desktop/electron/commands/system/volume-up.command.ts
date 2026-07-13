import { ICommand, CommandContext, CommandResult } from "../types";
import { VolumeService } from "../../services/volume.service";

export class VolumeUpCommand implements ICommand {
  readonly name = "volume_up";

  readonly description = "Increase the system volume.";

  readonly parameters = [
    {
      name: "step",
      type: "number",
      description: "Percentage to increase the volume.",
      required: false,
    },
  ] as const;

  private readonly volumeService = new VolumeService();

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const payload = (context.payload ?? {}) as { step?: number };

      const step = payload.step ?? 10;

      await this.volumeService.increase(step);

      return {
        success: true,
        type: "command",
        data: `System volume increased by ${step}%.`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to increase system volume.",
      };
    }
  }
}