import {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types";

import {
  copyToClipboard,
  getClipboard,
  clearClipboard,
} from "../../services/clipboard.service";

interface ClipboardPayload {
  action: "copy" | "get" | "clear";
  text?: string;
}

export class ClipboardCommand implements ICommand {
  readonly name = "clipboard";

  readonly description =
    "Controls the Windows clipboard.";

  readonly plannerHints = [
    "copy text",
    "copy this",
    "copy to clipboard",
    "clipboard",
    "what is in my clipboard",
    "show clipboard",
    "clear clipboard",
  ];

  readonly parameters = [
    {
      name: "action",
      type: "string",
      required: true,
      description:
        "copy, get or clear",
    },
    {
      name: "text",
      type: "string",
      required: false,
      description:
        "Text to copy to the clipboard.",
    },
  ] as const;

  async execute(
    context: CommandContext
  ): Promise<CommandResult> {
    const payload =
      context.payload as Partial<ClipboardPayload>;

    const action = payload.action;

    if (!action) {
      return {
        success: false,
        error: "ACTION_REQUIRED",
      };
    }

    try {
      switch (action) {
        case "copy": {
          const text = payload.text?.trim();

          if (!text) {
            return {
              success: false,
              error: "TEXT_REQUIRED",
            };
          }

          await copyToClipboard(text);

          return {
            success: true,
            data: {
              action,
              text,
            },
          };
        }

        case "get": {
          const text =
            await getClipboard();

          return {
            success: true,
            data: {
              action,
              text,
            },
          };
        }

        case "clear": {
          await clearClipboard();

          return {
            success: true,
            data: {
              action,
            },
          };
        }

        default:
          return {
            success: false,
            error:
              "INVALID_ACTION",
          };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "CLIPBOARD_OPERATION_FAILED",
      };
    }
  }
}