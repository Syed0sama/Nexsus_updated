import {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types";

import { openApplication } from "../../services/open-app.service";

interface OpenAppPayload {
  target: string;
  url?: string;
}

export class OpenAppCommand implements ICommand {
  readonly name = "openApp";

  readonly description =
    "Opens an application, folder, file, or website.";
  
  readonly plannerHints = [
    "Use this tool to open websites through Chrome using HTTPS URLs.",
    "Website requests should use target='chrome' and provide a complete HTTPS url.",
    "YouTube search requests should open Chrome with a YouTube search URL.",
    "Example: Search 'belki' on YouTube means target='chrome' and url='https://www.youtube.com/search?q=belki'."
  ];

  readonly parameters = [
    {
      name: "target",
      type: "string",
      required: true,
      description:
        "Application, folder, file, or other resource to open.",
    },
    {
      name: "url",
      type: "string",
      required: false,
      description:
        "Optional HTTPS URL to open with the target application.",
    },
  ] as const;

  async execute(
    context: CommandContext
  ): Promise<CommandResult> {
    const payload =
      context.payload as Partial<OpenAppPayload>;

    const target = payload.target?.trim();

    if (!target) {
      return {
        success: false,
        error: "TARGET_REQUIRED",
      };
    }

    try {
      await openApplication(target, payload.url);

      return {
        success: true,
        data: {
          target,
          url: payload.url ?? null,
          status: "opened",
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "FAILED_TO_OPEN_RESOURCE",
      };
    }
  }
}