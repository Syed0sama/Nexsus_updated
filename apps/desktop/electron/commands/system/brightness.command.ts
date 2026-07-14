import {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types";

import {
  increaseBrightness,
  decreaseBrightness,
  setBrightness,
  getBrightness,
} from "../../services/brightness.service";

interface BrightnessPayload {
  action: "increase" | "decrease" | "set" | "get";
  value?: number;
}

export class BrightnessCommand implements ICommand {
  readonly name = "brightness";

  readonly description =
    "Controls the system display brightness.";

  readonly plannerHints = [
    "increase brightness",
    "decrease brightness",
    "brightness up",
    "brightness down",
    "set brightness",
    "brightness",
    "screen brightness",
  ];

  readonly parameters = [
    {
      name: "action",
      type: "string",
      required: true,
      description:
        "increase, decrease, set or get",
    },
    {
      name: "value",
      type: "number",
      required: false,
      description:
        "Brightness percentage (0-100). Required for 'set'.",
    },
  ] as const;

  async execute(
    context: CommandContext
  ): Promise<CommandResult> {
    const payload =
      context.payload as Partial<BrightnessPayload>;

    const action = payload.action;

    if (!action) {
      return {
        success: false,
        error: "ACTION_REQUIRED",
      };
    }

    try {
      switch (action) {
        case "increase":
          await increaseBrightness();
          break;

        case "decrease":
          await decreaseBrightness();
          break;

        case "set":
          await setBrightness(payload.value ?? 50);
          break;

        case "get":
          await getBrightness();
          break;

        default:
          return {
            success: false,
            error: "INVALID_ACTION",
          };
      }

      return {
        success: true,
        data: {
          action,
          value: payload.value ?? null,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "FAILED_TO_CONTROL_BRIGHTNESS",
      };
    }
  }
}