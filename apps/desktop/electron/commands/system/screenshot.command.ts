import {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types"

import { screenshotService } from "../../services/screenshot.service";

export class ScreenshotCommand
  implements ICommand
{
  readonly name = "screenshot";

  readonly description =
    "Captures the current screen.";

  readonly plannerHints = [
    "take screenshot",
    "capture screen",
    "take a screenshot",
    "capture my screen",
    "save screenshot",
  ];

  readonly parameters = [
    {
      name: "type",
      type: "string",
      required: false,
      description:
        "Screenshot type.",
    },
  ] as const;


  async execute(
    _context: CommandContext
  ): Promise<CommandResult> {

    try {
      const filePath =
        await screenshotService.capture();

      return {
        success: true,
        data: {
          status: "captured",
          filePath,
        },
      };

    } catch (error) {

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "SCREENSHOT_FAILED",
      };

    }
  }
}